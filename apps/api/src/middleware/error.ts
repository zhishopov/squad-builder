import { NextFunction, Request, Response } from "express";

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = typeof error?.status === "number" ? error.status : 500;

  let message: string;

  if (process.env.NODE_ENV === "production") {
    if (status === 401) message = "Unauthorized";
    else if (status === 403) message = "Forbidden";
    else if (status === 400) message = error?.message || "Bad Request";
    else if (status === 404) message = "Not Found";
    else message = "Something went wrong";
  } else {
    message = error?.message || "Unknown error";
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Error:", error);
  }

  res.status(status).json({ error: message });
}
