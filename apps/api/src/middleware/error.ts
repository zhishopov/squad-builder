import { NextFunction, Request, Response } from "express";

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = typeof error?.status === "number" ? error.status : 500;

  let message;

  if (process.env.NODE_ENV === "production") {
    message = status === 404 ? "Not Found" : "Something went wrong";
  } else {
    message = error?.message || "Unknown error";
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Error: ", error);
  }

  res.status(status).json({ error: message });
}
