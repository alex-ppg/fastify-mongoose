"use strict";

const fastifyPlugin = require("fastify-plugin");
const mongoose = require("mongoose");

async function mongooseConnector(fastify, { uri, settings, models = [] }) {
  await mongoose.connect(
    uri,
    settings
  );

  const decorator = {
    instance: mongoose
  };

  if (models.length !== 0) {
    models.forEach(model => {
      decorator[
        model.alias
          ? model.alias
          : `${model.name[0].toUpperCase()}${model.name.slice(1)}`
      ] = mongoose.model(model.name, new mongoose.Schema(model.schema));
    });
  }

  fastify.decorate("mongoose", decorator);
}

module.exports = fastifyPlugin(mongooseConnector);
