# Fastify CockroachDB Plugin using Sequelize ORM

[![NPM](https://nodei.co/npm/fastify-mongoose.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/fastify-mongoose/)

[![CircleCI](https://circleci.com/gh/alex-ppg/fastify-mongoose.svg?style=svg)](https://circleci.com/gh/alex-ppg/fastify-mongoose)

## Installation

```bash
npm i fastify-mongoose -s
```

## Usage

```javascript
// ...Other Plugins
fastify.register(
  require("fastify-mongoose"),
  {
    uri: "mongodb://admin:pass@localhost:27017/database_name",
    settings: {
      useNewUrlParser: true,
      config: {
        autoIndex: true
      }
    },
    models: [
      {
        name: "posts",
        alias: "Post",
        schema: {
          title: {
            type: String,
            required: true
          },
          content: {
            type: String,
            required: true
          }
        }
      },
      {
        name: "accounts",
        alias: "Account",
        schema: {
          username: {
            type: String
          },
          password: {
            type: String,
            select: false,
            required: true
          },
          email: {
            type: String,
            unique: true,
            required: true,
            validate: {
              validator: v => {
                // Super simple email regex: https://stackoverflow.com/a/4964763/7028187
                return /^.+@.{2,}\..{2,}$/.test(v);
              },
              message: props => `${props.value} is not a valid email!`
            }
          },
          // We can add references to other Schemas like-so
          posts: [
            {
              type: "ObjectId",
              ref: "Post",
              validateExistance: true
            }
          ],
          createdAtUTC: {
            type: Date,
            required: true
          }
        }
      }
    ]
  },
  err => {
    if (err) throw err;
  }
);

fastify.get("/", (request, reply) => {
  console.log(fastify.mongoose.instance); // Mongoose ODM instance
  console.log(fastify.mongoose.Account); // Any models declared are available here
});
```

## Options

| Option     | Description                                                                                                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uri`      | Required, the Unique Resource Identifier to use when connecting to the Database.                                                                                                                      |
| `settings` | Optional, the settings to be passed on to the MongoDB Driver as well as the Mongoose-specific options. [Refer here for further info](https://mongoosejs.com/docs/api.html#mongoose_Mongoose-connect). |
| `models`   | Optional, any models to be declared and injected under `fastify.mongoose`                                                                                                                             |

Any models declared should follow the following format:

```javascript
{
  name: "profiles", // Required, should match name of model in database
  alias: "Profile", // Optional, an alias to inject the model as
  schema: schemaDefinition // Required, should match schema of model in database
}
```

The `schemaDefinition` variable should be created according to the [Mongoose Model Specification](https://mongoosejs.com/docs/schematypes.html).

Keep in mind that, if an `"ObjectId"` is specified as the `type`, the referenced `Schema` must have been defined first in the `models` input array of the library.

## Author

[Alex Papageorgiou](alex.ppg@pm.me)

## License

Licensed under [GPLv3](./LICENSE).
