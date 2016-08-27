import fs from "fs";
import os from "os";
import POGOProtos from "pokemongo-protobuf";

import {
  inherit,
  _toCC
} from "./utils";

import CFG from "../cfg";

import World from "./models/World";

import * as _api from "./api";
import * as _dump from "./dump";
import * as _http from "./http";
import * as _setup from "./setup";
import * as _cycle from "./cycle";
import * as _request from "./request";
import * as _response from "./response";
import * as _process from "./process";
import * as _mysql from "./db/index";
import * as _mysql_get from "./db/get";
import * as _mysql_query from "./db/query";
import * as _mysql_create from "./db/create";

const greetMessage = fs.readFileSync(".greet", "utf8");

/**
 * @class GameServer
 */
export default class GameServer {

  /** @constructor */
  constructor() {

    this.STATES = {
      PAUSE: false,
      DEBUG: false,
      CRASH: false
    };

    this.db = null;

    this.apiClients = {};

    this.assets = {};
    this.master = null;
    this.socket = null;
    this.cycleInstance = null;

    // Timer things
    this.tick = 0;
    this.time = 0;
    this.fullTick = 0;
    this.saveTick = 0;
    this.timeoutTick = 0;
    this.passedTicks = 0;

    if (CFG.GREET) this.greet();

    this.print(`Booting Server v${require("../package.json").version}-dev`, 33);

    this.world = new World(this);

    this.setup();

  }

  /**
   * @param {String} msg
   * @param {Number} color
   * @param {Boolean} nl
   */
  print(msg, color, newline) {
    color = Number.isInteger(color) ? color : CFG.DEFAULT_CONSOLE_COLOR;
    process.stdout.write(`[Console] \x1b[${color};1m${msg}\x1b[0m${newline === void 0 ? "\n" : ""}`);
  }

  /**
   * @param {Object} obj
   * @return {Boolean}
   */
  isApiCall(call) {
    let action = String(call.action);
    return (
      "api_" + action in _api
    );
  }

  /**
   * @param {String} msg
   * @param {Function} fn
   * @param {Number} timer
   */
  retry(msg, fn, timer) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    this.print(`${msg}${timer}s`, 33, true);
    if (timer >= 1) setTimeout(() => this.retry(msg, fn, --timer), 1e3);
    else {
      process.stdout.write("\n");
      fn();
    }
  }

  /**
   * @return {String}
   */
  getLocalIPv4() {
    let address = null;
    let interfaces = os.networkInterfaces();
    for (var dev in interfaces) {
      interfaces[dev].filter((details) => details.family === "IPv4" && details.internal === false ? address = details.address: void 0);
    };
    return (address);
  }

  /**
   * @param {Buffer} buffer
   * @param {String} schema
   */
  parseProtobuf(buffer, schema) {
    try {
      return POGOProtos.parseWithUnknown(buffer, schema);
    } catch (e) {
      this.print(e, 31);
    }
  }

  /**
   * @param {Request} req
   */
  parseSignature(req) {
    let key = pcrypt.decrypt(req.unknown6.unknown2.encrypted_signature);
    return (
      POGOProtos.parseWithUnknown(key, "POGOProtos.Networking.Envelopes.Signature")
    );
  }

  /**
   * @param {String} path
   * @return {Boolean}
   */
  fileExists(path) {
    try {
      fs.statSync(path);
    } catch (e) {
      return (false);
    }
    return (true);
  }

  greet() {
    console.log(greetMessage);
  }

}

inherit(GameServer, _api);
inherit(GameServer, _dump);
inherit(GameServer, _http);
inherit(GameServer, _setup);
inherit(GameServer, _cycle);
inherit(GameServer, _request);
inherit(GameServer, _response);
inherit(GameServer, _process);
inherit(GameServer, _mysql);
inherit(GameServer, _mysql_get);
inherit(GameServer, _mysql_query);
inherit(GameServer, _mysql_create);

(() => {

  const server = new GameServer();

  process.openStdin().addListener("data", (data) => {
    server.stdinInput(data);
  });

  process.on("uncaughtException", (data) => {
    server.uncaughtException(data);
  });

})();