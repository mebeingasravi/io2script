import Joi from 'joi';
import ApiError from '../helper/ApiError.js';
import { STRATEGY_TYPES } from '../models/script.model.js';

const createScriptSchema = Joi.object({
  script_name: Joi.string().trim().min(1).max(255).required(),
  strategy_type: Joi.string()
    .valid(...STRATEGY_TYPES)
    .required(),
  description: Joi.string().trim().max(500).required(),
  react_script: Joi.string().required(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const logsQuerySchema = Joi.object({
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso().min(Joi.ref('date_from')),
});

const idParamSchema = Joi.object({
  id: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),
});

/**
 * Builds an Express middleware that validates `req[source]` against a Joi
 * schema, replacing it with the parsed/defaulted value on success or
 * forwarding a 400 `ApiError` on failure.
 *
 * @param {Joi.ObjectSchema} schema
 * @param {'body'|'query'|'params'} source
 * @returns {import('express').RequestHandler}
 */
function validate(schema, source) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return next(new ApiError(400, error.details.map((detail) => detail.message).join(', ')));
    }

    req[source] = value;
    return next();
  };
}

export const createScriptValidator = validate(createScriptSchema, 'body');
export const paginationValidator = validate(paginationSchema, 'query');
export const logsQueryValidator = validate(logsQuerySchema, 'query');
export const idParamValidator = validate(idParamSchema, 'params');
