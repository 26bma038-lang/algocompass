import { PATH_SHEET_ID } from "@/data/sheets";

/** Where a sheet lives in Practice. The Beginner Path lives in Learn. */
export const sheetPath = (id: string) => (id === PATH_SHEET_ID ? "/learn#path" : `/practice/sheets/${id}`);
