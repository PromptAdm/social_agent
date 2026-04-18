from datetime import datetime
from typing import Any

from pydantic import BaseModel, model_validator


class GenerationResultOut(BaseModel):
    id:            int
    project_type:  str
    project_id:    int
    result_type:   str
    file_path:     str | None = None
    file_url:      str | None = None
    metadata:      dict[str, Any] | None = None
    created_at:    datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_metadata(cls, values: Any) -> Any:
        import json
        if hasattr(values, "__dict__"):
            raw = getattr(values, "metadata_json", None)
            if raw and isinstance(raw, str):
                try:
                    object.__setattr__(values, "metadata", json.loads(raw))
                except Exception:
                    pass
        return values


class ImageProjectOut(BaseModel):
    id:              int
    user_id:         int
    brand_id:        int | None = None
    title:           str | None = None
    status:          str
    input_type:      str
    input_prompt:    str | None = None
    direction:       dict[str, Any] | None = None  # input_prompt parsed as JSON
    credits_cost:    int
    error_message:   str | None = None
    created_at:      datetime
    updated_at:      datetime
    results:         list[GenerationResultOut] = []

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_direction(cls, values: Any) -> Any:
        import json
        if hasattr(values, "__dict__"):
            raw = getattr(values, "input_prompt", None)
            if raw and isinstance(raw, str):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict):
                        object.__setattr__(values, "direction", parsed)
                except Exception:
                    pass
        return values


class VideoProjectOut(BaseModel):
    id:              int
    user_id:         int
    brand_id:        int | None = None
    title:           str | None = None
    status:          str
    input_file_name: str | None = None
    input_file_size: int | None = None
    language:        str
    credits_cost:    int
    error_message:   str | None = None
    created_at:      datetime
    updated_at:      datetime
    results:         list[GenerationResultOut] = []

    model_config = {"from_attributes": True}


class ProjectHistoryOut(BaseModel):
    image_projects: list[ImageProjectOut]
    video_projects: list[VideoProjectOut]
    image_total:    int
    video_total:    int


class UploadedFileOut(BaseModel):
    file_path:      str
    file_url:       str
    original_name:  str
    size_bytes:     int
    content_type:   str
