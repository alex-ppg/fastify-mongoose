"use strict";

const fastify = require("fastify")();
const tap = require("tap");
const fastifyMongoose = require("./index");

tap.test("fastify.mongoose should exist", async test => {
  test.plan(6);

  fastify.register(fastifyMongoose, {
    uri: "mongodb://localhost:27017/test",
    settings: {
      useNewUrlParser: true,
      config: {
        autoIndex: true
      }
    },
    models: [
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
          createdAtUTC: {
            type: Date,
            required: true
          }
        }
      }
    ]
  });

  fastify.post("/", async ({ body }, reply) => {
    const { username, password, email } = body;
    const createdAtUTC = new Date();
    const account = new fastify.mongoose.Account({
      username,
      password,
      email,
      createdAtUTC
    });
    await account.save();
    return await fastify.mongoose.Account.findOne({ email });
  });

  try {
    await fastify.ready();
    test.ok(fastify.mongoose.instance);
    test.ok(fastify.mongoose.Account);

    const { statusCode, payload } = await fastify.inject({
      method: "POST",
      url: "/",
      payload: { username: "test", password: "pass", email: "test@example.com" }
    });

    const { username, password, email } = JSON.parse(payload);
    test.strictEqual(statusCode, 200);
    test.strictEqual(username, "test");
    test.strictEqual(password, undefined);
    test.strictEqual(email, "test@example.com");
  } catch (e) {
    test.fail("Fastify threw", e);
  }
  fastify.mongoose.instance.connection.close();
});
