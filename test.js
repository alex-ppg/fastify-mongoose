"use strict";

const fastify = require("fastify")();
const tap = require("tap");
const fastifyMongoose = require("./index");

tap.test("fastify.mongoose should exist", async test => {
  test.plan(9);

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
          },
          author: {
            type: "ObjectId",
            ref: "Account",
            validateExistance: true
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
    ],
    useNameAndAlias: true
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

  fastify.patch("/", async ({ body }, reply) => {
    const { title, content, author } = body;
    const createdAtUTC = new Date();
    const post = new fastify.mongoose.Post({
      title,
      content,
      author
    });
    await post.save();
    return await fastify.mongoose.Post.findById(post._id);
  });

  try {
    await fastify.ready();
    test.ok(fastify.mongoose.instance);
    test.ok(fastify.mongoose.Account);

    const testEmail = `${(+new Date()).toString(36).slice(-5)}@example.com`;

    let { statusCode, payload } = await fastify.inject({
      method: "POST",
      url: "/",
      payload: {
        username: "test",
        password: "pass",
        email: testEmail
      }
    });

    const { username, password, email, _id } = JSON.parse(payload);
    test.strictEqual(statusCode, 200);
    test.strictEqual(username, "test");
    test.strictEqual(password, undefined);
    test.strictEqual(email, testEmail);

    ({ statusCode, payload } = await fastify.inject({
      method: "PATCH",
      url: "/",
      payload: { author: _id, title: "Hello World", content: "foo bar" }
    }));

    const { title, content, author } = JSON.parse(payload);
    test.strictEqual(title, "Hello World");
    test.strictEqual(content, "foo bar");
    test.strictEqual(author, _id);
  } catch (e) {
    test.fail("Fastify threw", e);
  }
  fastify.mongoose.instance.connection.close();
});
