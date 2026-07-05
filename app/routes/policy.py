from pathlib import Path

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
)

from app.tools.pdf_policy_tool import (
    get_policy_metadata,
    process_policy_pdf,
    remove_active_policy,
)

from app.tools.policy_tool import (
    active_policy_exists,
    load_travel_policy,
)


router = APIRouter(
    prefix="/api/policy",
    tags=["Travel Policy"],
)


MAX_FILE_SIZE_BYTES = (
    5
    * 1024
    * 1024
)


@router.post("/upload")
async def upload_travel_policy(
    file: UploadFile = File(...),
):
    filename = (
        file.filename
        or "travel-policy.pdf"
    )

    suffix = (
        Path(filename)
        .suffix
        .lower()
    )

    if suffix != ".pdf":
        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF files are supported."
            ),
        )

    file_bytes = await file.read()
    await file.close()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded PDF is empty."
            ),
        )

    if (
        len(file_bytes)
        > MAX_FILE_SIZE_BYTES
    ):
        raise HTTPException(
            status_code=413,
            detail=(
                "The PDF must be smaller "
                "than 5 MB."
            ),
        )

    if not file_bytes.startswith(
        b"%PDF"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file is not "
                "a valid PDF."
            ),
        )

    try:
        processed_policy = (
            process_policy_pdf(
                pdf_bytes=file_bytes,
                filename=filename,
            )
        )

        # Reload through policy_tool so the
        # strict uploaded-policy sanitisation
        # is applied immediately.
        active_policy = (
            load_travel_policy()
        )

        return {
            "success": True,
            "message": (
                "Travel policy uploaded "
                "and activated successfully."
            ),
            "source":
                "uploaded_pdf",
            "active_policy_available":
                active_policy_exists(),
            "policy":
                active_policy,
            **processed_policy,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Policy processing failed: "
                f"{exc}"
            ),
        ) from exc


@router.get("/current")
def get_current_travel_policy():
    try:
        policy = (
            load_travel_policy()
        )

        metadata = (
            get_policy_metadata()
        )

        source = (
            policy
            .get(
                "source",
                {},
            )
            .get("type")
            or (
                "uploaded_pdf"
                if active_policy_exists()
                else "default_demo_policy"
            )
        )

        return {
            "success": True,
            "source": source,
            "active_policy_available":
                active_policy_exists(),
            "using_default_demo_policy":
                (
                    source
                    == "default_demo_policy"
                ),
            "policy": policy,
            "metadata": metadata,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load travel "
                f"policy: {exc}"
            ),
        ) from exc


@router.delete("/active")
def reset_travel_policy():
    remove_active_policy()

    default_policy = (
        load_travel_policy()
    )

    return {
        "success": True,
        "message": (
            "Uploaded policy removed. "
            "TripGuard is now using the "
            "default demo policy."
        ),
        "source":
            "default_demo_policy",
        "active_policy_available":
            False,
        "using_default_demo_policy":
            True,
        "policy":
            default_policy,
    }