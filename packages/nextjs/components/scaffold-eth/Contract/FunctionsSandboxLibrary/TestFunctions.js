var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
const vm2_1 = require("vm2");
const { simulateRequest, getDecodedResultLog, getRequestConfig } = require(".");
const Functions_1 = require("./Functions");
const Validator_1 = require("./Validator");
const process_1 = __importDefault(require("process"));

const TestFunctions = async () => {
  const unvalidatedRequestConfig = require("./Functions-request-config.js");

  const requestConfig = getRequestConfig(unvalidatedRequestConfig);

  const functionsModule = new Functions_1.FunctionsModule();
  const Functions = functionsModule.buildFunctionsmodule(requestConfig.numAllowedQueries);
  // eval("const Functions =" + require("./Functions"));
  // let res = eval(requestConfig.source);
  // console.log(res);
  // let res = Function(requestConfig.source);
  // console.log(res);
  const vm = new vm2_1.NodeVM({
    sandbox: { Functions },
    console: `${this.enableSandboxedLogging ? "inherit" : "off"}`,
    eval: false,
    wasm: false,
    require: {
      builtin: ["buffer", "crypto", "querystring", "string_decoder", "url", "util"],
    },
  });
  functionScript = new vm2_1.VMScript(
    "module.exports = async function () {\n" + requestConfig.source + "\n}",
  ).compile();

  let sandboxedFunction = await vm.run(functionScript);
  let result;
  console.log("sandboxedFunction", sandboxedFunction);

  result = await sandboxedFunction();
  console.log("result", result);

  const validator = new Validator_1.Validator(
    parseInt(process_1.default.env["DEFAULT_MAX_RESPONSE_BYTES"] ?? "256"),
    parseInt(process_1.default.env["DEFAULT_MAX_HTTP_QUERIES"] ?? "5"),
  );
  const success = validator.encodeResponse(result);

  const getDecodedResultLog = (config, successResult) => {
    let resultLog = "";
    if (config.expectedReturnType && config.expectedReturnType !== "Buffer") {
      let decodedOutput;
      switch (config.expectedReturnType) {
        case "uint256":
          decodedOutput = BigInt("0x" + successResult.slice(2).slice(-64));
          break;
        case "int256":
          decodedOutput = signedInt256toBigInt("0x" + successResult.slice(2).slice(-64));
          break;
        case "string":
          decodedOutput = Buffer.from(successResult.slice(2), "hex").toString();
          break;
        default:
          const end = config.expectedReturnType;
          throw new Error(`unused expectedReturnType ${end}`);
      }
      const decodedOutputLog = `Decoded as a ${config.expectedReturnType}: ${decodedOutput}`;
      resultLog += `${decodedOutputLog}\n`;
    }
    console.log(resultLog);
    return;
  };
  getDecodedResultLog(requestConfig, success);
};
