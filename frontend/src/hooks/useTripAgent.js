import {
  useMemo,
  useState,
} from "react";

import {
  API_URL,
  createTripRun,
} from "../services/api";

import {
  saveAgentRun,
} from "../services/storage";


function createRunId() {
  const timestamp =
    Date.now().toString(36);

  const randomPart =
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

  return (
    `RUN-${timestamp}-${randomPart}`
  );
}


function createTimestamp() {
  return new Date().toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}


export default function useTripAgent() {
  const [steps, setSteps] =
    useState([]);

  const [result, setResult] =
    useState(null);

  const [running, setRunning] =
    useState(false);

  const [started, setStarted] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    currentRunId,
    setCurrentRunId,
  ] = useState(null);

  const totalExpectedSteps = 7;

  const progress = useMemo(() => {
    if (result) {
      return 100;
    }

    return Math.min(
      Math.round(
        (
          steps.length /
          totalExpectedSteps
        ) * 100,
      ),
      100,
    );
  }, [
    result,
    steps,
  ]);

  async function runTrip(form) {
    const runId =
      createRunId();

    const collectedSteps = [];

    setCurrentRunId(runId);
    setRunning(true);
    setStarted(false);
    setSteps([]);
    setResult(null);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/plan/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            form,
          ),
        },
      );

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => null);

        throw new Error(
          payload?.detail ||
            `Backend returned HTTP ${response.status}.`,
        );
      }

      if (!response.body) {
        throw new Error(
          "Streaming is not supported by this browser.",
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";

      async function processStreamEvent(
        streamEvent,
      ) {
        if (
          streamEvent.type ===
          "started"
        ) {
          setStarted(true);
          return;
        }

        if (
          streamEvent.type ===
          "step"
        ) {
          const stepWithTime = {
            ...streamEvent,
            timestamp:
              createTimestamp(),
          };

          collectedSteps.push(
            stepWithTime,
          );

          setSteps([
            ...collectedSteps,
          ]);

          return;
        }

        if (
          streamEvent.type ===
          "final"
        ) {
          const finalResult =
            streamEvent.result;

          const approvalRequired =
            Boolean(
              finalResult
                ?.compliance
                ?.approval_required,
            );

          const runRecord = {
            id: runId,

            created_at:
              new Date().toISOString(),

            request: {
              ...form,
            },

            result: finalResult,

            trace: [
              ...collectedSteps,
            ],

            approval_status:
              approvalRequired
                ? "pending"
                : "not_required",

            approval: null,

            source: "web_app",
          };

          setResult(finalResult);

          saveAgentRun(
            runRecord,
          );

          try {
            await createTripRun(
              runRecord,
            );
          } catch (
            persistenceError
          ) {
            console.warn(
              "Trip run was saved locally but could not be persisted to the backend:",
              persistenceError,
            );
          }

          return;
        }

        if (
          streamEvent.type ===
          "error"
        ) {
          setError(
            streamEvent.message ||
              "The agent encountered an error.",
          );
        }
      }

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(
          value,
          {
            stream: true,
          },
        );

        const lines =
          buffer.split("\n");

        buffer =
          lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            await processStreamEvent(
              JSON.parse(line),
            );
          } catch {
            console.error(
              "Invalid stream event:",
              line,
            );
          }
        }
      }

      if (buffer.trim()) {
        await processStreamEvent(
          JSON.parse(buffer),
        );
      }
    } catch (requestError) {
      setError(
  requestError instanceof Error
    ? requestError.message
    : "Unable to connect to TripGuard AI.",
);
    } finally {
      setRunning(false);
    }
  }

  function resetAgent() {
    setSteps([]);
    setResult(null);
    setRunning(false);
    setStarted(false);
    setError("");
    setCurrentRunId(null);
  }

  return {
    steps,
    result,
    running,
    started,
    error,
    progress,
    currentRunId,
    runTrip,
    resetAgent,
  };
}