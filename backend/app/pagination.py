from dataclasses import dataclass
from typing import Mapping

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


@dataclass(frozen=True)
class PaginationParams:
    page: int
    page_size: int
    offset: int


class PaginationValidationError(ValueError):
    pass


def parse_pagination_args(args: Mapping[str, str]) -> PaginationParams:
    page_raw = str(args.get("page", DEFAULT_PAGE)).strip()
    page_size_raw = str(args.get("pageSize", DEFAULT_PAGE_SIZE)).strip()

    try:
        page = int(page_raw)
    except ValueError as error:
        raise PaginationValidationError("page must be a positive integer") from error

    try:
        page_size = int(page_size_raw)
    except ValueError as error:
        raise PaginationValidationError("pageSize must be a positive integer") from error

    if page <= 0:
        raise PaginationValidationError("page must be a positive integer")
    if page_size <= 0:
        raise PaginationValidationError("pageSize must be a positive integer")

    capped_page_size = min(page_size, MAX_PAGE_SIZE)
    return PaginationParams(page=page, page_size=capped_page_size, offset=(page - 1) * capped_page_size)


def build_pagination_meta(total: int, pagination: PaginationParams) -> dict[str, int | bool]:
    has_more = pagination.offset + pagination.page_size < total
    return {
        "total": total,
        "page": pagination.page,
        "pageSize": pagination.page_size,
        "hasMore": has_more,
    }
