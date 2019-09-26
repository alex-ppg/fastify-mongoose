"use strict";

const fastifyPlugin = require("fastify-plugin");
const mongoose = require("mongoose");

const fixReferences = (decorator, schema) => {
  Object.keys(schema).forEach(key => {
    if (schema[key].type === "ObjectId") {
      schema[key].type = mongoose.Schema.Types.ObjectId;

      if (schema[key].validateExistance) {
        delete schema[key].validateExistance;
        schema[key].validate = {
          isAsync: true,
          validator: (v, cb) => {
            decorator[schema[key].ref]
              .findById(v)
              .then(() => {
                cb(true);
              })
              .catch(() => {
                /* istanbul ignore next */
                cb(
                  false,
                  `${schema[key].ref} with ID ${v} does not exist in database!`
                );
              });
          }
        };
      }
    } else if (schema[key].length !== undefined) {
      schema[key].forEach(member => {
        if (member.type === "ObjectId") {
          member.type = mongoose.Schema.Types.ObjectId;

          if (member.validateExistance) {
            delete member.validateExistance;

            member.validate = {
              isAsync: true,
              validator: (v, cb) => {
                decorator[member.ref]
                  .findById(v)
                  .then(() => {
                    cb(true);
                  })
                  .catch(() => {
                    /* istanbul ignore next */
                    cb(false, `Post with ID ${v} does not exist in database!`);
                  });
              }
            };
          }
        }
      });
    }
  });
};

async function mongooseConnector(
  fastify,
  { uri, settings, models = [], useNameAndAlias = false }
) {
  await mongoose.connect(uri, settings);

  const decorator = {
    instance: mongoose
  };

  if (models.length !== 0) {
    models.forEach(model => {
      fixReferences(decorator, model.schema);

      if (useNameAndAlias) {
        if (model.alias === undefined)
          throw new Error(`No alias defined for ${model.name}`);

        decorator[model.alias] = mongoose.model(
          model.alias,
          new mongoose.Schema(model.schema),
          model.name
        );
      } else {
        decorator[
          model.alias
            ? model.alias
            : `${model.name[0].toUpperCase()}${model.name.slice(1)}`
        ] = mongoose.model(model.name, new mongoose.Schema(model.schema));
      }
    });
  }

  fastify.decorate("mongoose", decorator);
}

module.exports = fastifyPlugin(mongooseConnector);
