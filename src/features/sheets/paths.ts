import { PATH_SHEET_ID } from "@/data/sheets";

/** Where a sheet lives in Practice. The Beginner Path has its own view. */
export const sheetPath = (id: string) => (id === PATH_SHEET_ID ? "/practice/path" : `/practice/sheets/${id}`);
