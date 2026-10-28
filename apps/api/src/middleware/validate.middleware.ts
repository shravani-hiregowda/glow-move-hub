import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err: unknown) {
      const isZod = err instanceof ZodError || (err && typeof err === "object" && (err as { name?: string }).name === "ZodError");
      if (isZod) {
        const zodErr = err as ZodError;
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: (zodErr.issues || []).map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
        });
        return;
      }
      next(err);
    }
  };
}
