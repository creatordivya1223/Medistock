/**
 * Reusable middleware that validates request data against a Zod schema.
 * Parses and replaces the target property (defaulting to req.body) on success,
 * or forwards the ZodError to the centralized error handler on failure.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @param {'body' | 'query' | 'params'} [source='body'] - The request property to validate.
 * @returns {import('express').RequestHandler}
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validate;
