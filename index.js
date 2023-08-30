"use strict";

const fastifyPlugin = require("fastify-plugin");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const fixReferences = (decorator, schema) => {
  Object.keys(schema).forEach((key) => {
    if (schema[key].type === "ObjectId") {
      schema[key].type = mongoose.Schema.Types.ObjectId;

      if (schema[key].validateExistance) {
        delete schema[key].validateExistance;
        schema[key].validate = {
          validator: async (v, cb) => {
            try {
              await decorator[schema[key].ref].findById(v);
            } catch (e) {
              /* istanbul ignore next */
              throw new Error(
                `${schema[key].ref} with ID ${v} does not exist in database!`
              );
            }
          },
        };
      }
    } else if (schema[key].length !== undefined) {
      schema[key].forEach((member) => {
        if (member.type === "ObjectId") {
          member.type = mongoose.Schema.Types.ObjectId;

          if (member.validateExistance) {
            delete member.validateExistance;

            member.validate = {
              validator: async (v, cb) => {
                try {
                  await decorator[member.ref].findById(v);
                } catch (e) {
                  /* istanbul ignore next */
                  throw new Error(
                    `Post with ID ${v} does not exist in database!`
                  );
                }
              },
            };
          }
        }
      });
    }
  });
};

const walkDir = (modelDirPath, fileList = []) => {
  const dir = fs.readdirSync(modelDirPath);
  dir.forEach((file) => {
    const pathFile = path.join(modelDirPath, file);
    const stat = fs.statSync(pathFile);
    if (stat.isDirectory())
      fileList = walkDir(pathFile, fileList);
    else
      fileList.push(pathFile);
  });
  return fileList
};

const loadModelsFromPath = (modelDirPath) => {
  const modelsFromPath = []
  const schemaFiles = walkDir(modelDirPath);
  schemaFiles.forEach((file) => {
    const model = require(file);
    modelsFromPath.push(model);
  });
  return modelsFromPath;
};

let decorator;

async function mongooseConnector(
  fastify,
  { uri, settings, models = [], useNameAndAlias = false,
    modelDirPath = undefined }
) {
  await mongoose.connect(uri, settings);

  decorator = {
    instance: mongoose,
  };

  if (modelDirPath) models = [...loadModelsFromPath(modelDirPath), ...models];

  if (models.length !== 0) {
    models.forEach((model) => {
      fixReferences(decorator, model.schema);

      const schema = new mongoose.Schema(model.schema, model.options);

      if (model.class) schema.loadClass(model.class);

      if (model.virtualize) model.virtualize(schema);

      if (useNameAndAlias) {
        /* istanbul ignore next */
        if (model.alias === undefined)
          throw new Error(`No alias defined for ${model.name}`);

        decorator[model.alias] = mongoose.model(
          model.alias,
          schema,
          model.name
        );
      } else {
        decorator[
          model.alias
            ? model.alias
            : `${model.name[0].toUpperCase()}${model.name.slice(1)}`
        ] = mongoose.model(model.name, schema);
      }
    });
  }

  // Close connection when app is closing
  fastify.addHook("onClose", (app, done) => {
    app.mongoose.instance.connection.on("close", function () {
      done();
    });
    app.mongoose.instance.connection.close();
  });

  fastify.decorate("mongoose", decorator);
}

module.exports = {
  plugin: fastifyPlugin(mongooseConnector),
  decorator: () => decorator,
};

module.exports.default = mongooseConnector
module.exports.mongooseConnector = mongooseConnector
