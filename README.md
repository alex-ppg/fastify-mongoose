# Fastify MongoDB Plugin using Mongoose ODM

[![NPM](https://nodei.co/npm/fastify-mongoose-driver.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/fastify-mongoose-driver/)

[![CircleCI](https://circleci.com/gh/alex-ppg/fastify-mongoose.svg?style=svg)](https://circleci.com/gh/alex-ppg/fastify-mongoose)

## Installation

```bash
npm i fastify-mongoose-driver -s
```

## Usage

```javascript
// ...Other Plugins
fastify.register(
  require("fastify-mongoose-driver").plugin,
  {
    uri: "mongodb://admin:pass@localhost:27017/database_name",
    settings: {
      useNewUrlParser: true,
      config: {
        autoIndex: true,
      },
    },
    models: [
      {
        name: "posts",
        alias: "Post",
        schema: {
          title: {
            type: String,
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
          // We can add references to other Schemas like-so
          author: {
            type: "ObjectId",
            ref: "Account",
            validateExistance: true,
          },
        },
        // We can also add schema configurable options
        options: {
          timestamps: true,
        },
      },
      {
        name: "accounts",
        alias: "Account",
        schema: {
          username: {
            type: String,
          },
          password: {
            type: String,
            select: false,
            required: true,
          },
          email: {
            type: String,
            unique: true,
            required: true,
            validate: {
              validator: (v) => {
                // Super simple email regex: https://stackoverflow.com/a/4964763/7028187
                return /^.+@.{2,}\..{2,}$/.test(v);
              },
              message: (props) => `${props.value} is not a valid email!`,
            },
          },
          createdAtUTC: {
            type: Date,
            required: true,
          },
        },
        virtualize: (schema) => {
          schema.virtual("posts", {
            ref: "Post",
            localKey: "_id",
            foreignKey: "author",
          });
        },
      },
    ],
    useNameAndAlias: true,
  },
  (err) => {
    if (err) throw err;
  }
);

fastify.get("/", (request, reply) => {
  console.log(fastify.mongoose.instance); // Mongoose ODM instance
  console.log(fastify.mongoose.Account); // Any models declared are available here
});

require("fastify-mongoose-driver").decorator(); // Returns the decorator pointer, useful for using mongoose in seperate files
```

## Options

| Option            | Description                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uri`             | Required, the Unique Resource Identifier to use when connecting to the Database.                                                                                                                      |
| `settings`        | Optional, the settings to be passed on to the MongoDB Driver as well as the Mongoose-specific options. [Refer here for further info](https://mongoosejs.com/docs/api.html#mongoose_Mongoose-connect). |
| `models`          | Optional, any models to be declared and injected under `fastify.mongoose`                                                                                                                             |
| `useNameAndAlias` | Optional, declares models using `mongoose.model(alias, schema, name)` instead of `mongoose.model(name, schema)`                                                                                       |

Any models declared should follow the following format:

```javascript
{
  name: "profiles", // Required, should match name of model in database
  alias: "Profile", // Optional, an alias to inject the model as
  schema: schemaDefinition, // Required, should match schema of model in database,
  options: schemaOptions, // Optional, schema configurable options
  class: classDefinition // Optional, should be an ES6 class wrapper for the model
}
```

The `schemaDefinition` variable should be created according to the [Mongoose Model Specification](https://mongoosejs.com/docs/schematypes.html).

The `schemaOptions` variable should be created according to the [Mongoose Model Options Specification](https://mongoosejs.com/docs/guide.html#options).

The `classDefinition` variable should be created according to the [Mongoose Class Specification](https://mongoosejs.com/docs/4.x/docs/advanced_schemas.html).

## Author

[Alex Papageorgiou](alex.ppg@pm.me)

## License

Licensed under [GPLv3](./LICENSE).
