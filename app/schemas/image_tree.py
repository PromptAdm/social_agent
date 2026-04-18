"""Schemas Pydantic para o módulo Árvore de Imagens."""

from pydantic import BaseModel

from app.schemas.projects import ImageProjectOut


class FamilyImageOut(BaseModel):
    file_path:     str
    file_url:      str
    prompt_used:   str
    variant_index: int


class ImageFamilyOut(BaseModel):
    family_id:     str
    family_name:   str
    style_variant: str
    description:   str
    images:        list[FamilyImageOut]
    refined_from:  str | None = None   # family_id de origem, quando for refinamento


class CreateImageProjectOut(BaseModel):
    project_id:   int
    credits_cost: int


class ImageTreeStatusOut(BaseModel):
    project:  ImageProjectOut
    phase:    str              # pending | generating | completed | failed
    families: list[ImageFamilyOut] | None = None


class RefineRequestIn(BaseModel):
    family_id: str   # família a ser refinada
    direction: str   # instrução livre de refinamento
