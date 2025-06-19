import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import colors from "colors";
import { DateTime } from "luxon";
import { HttpsProxyAgent } from "https-proxy-agent";
import "dotenv/config";
import { Evm } from "./helper/evm_wallet.js";
import { Web3 } from "web3";
import axiosRetry from "axios-retry";
import readline from "readline";
import { formatEther, parseEther } from "ethers";
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const __dirname = path.resolve();
//#region ABI
const abi_safeMint = [
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
    ],
    name: "safeMint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const abi_balance = [
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];
const abi_placeBet = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "matchId",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "outcome",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const abi_approve = [
  {
    constant: false,
    inputs: [
      {
        name: "spender",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "success",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const contract_info = [
  {
    CA: "0xa0D4687483F049c53e6EC8cBCbc0332C74180168",
    name: "Camp Mystery Box - Beginner Tier",
  },
  {
    CA: "0x0A65888A4F76D821A3148620866BC65A5db599BB",
    name: "Camp Mystery Box - Explorer Tier",
  },
  {
    CA: "0xec735A2Ba32703215b3e40d669C61FBd849b422a",
    name: "Camp Mystery Box - Cat Savior Tier",
  },
  {
    CA: "0x5B1793d4AA54a36ad5F53d20C9ad1eEd8609410C",
    name: "Camp Mystery Box - Cat Lover Tier",
  },
  {
    CA: "0xD6265283Af414697b61a46272669f21e6131628f",
    name: "Campt Mystery Box - Cats Fan",
  },
];
//#endregion

class Account {
  constructor(index, privateKey, proxy, input_program, config) {
    this.index = index;
    this.privateKey = privateKey;
    let [ip, port, user, password] = proxy.split(":");
    this.proxy = `http://${user}:${password}@${ip}:${port}`;
    this.web3 = new Evm(this.privateKey, this.proxy);
    this.address = this.web3.address;
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,en-GB;q=0.8,en-CA;q=0.7",
      "content-type": "application/json",
      origin: "https://app.scoreplay.xyz",
      accept: "application/json, text/plain, */*",
      "next-action": "4089e291e228855bf495ec5c1673fa67c90bce5e9c",
      baggage:
        "sentry-environment=production,sentry-release=Kj--WrVGa71sXvL0AVLA4,sentry-public_key=4ad3a1e570e1129ac7e24d2e4bdae7d9,sentry-trace_id=d4de8adbca3f4e676ba696ea2c7c151b,sentry-sample_rate=1,sentry-transaction=GET%20%2Fprofile,sentry-sampled=true",
    };
    this.input_program = input_program;
    this.headers2 = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,en-GB;q=0.8,en-CA;q=0.7",
      "content-type": "application/json",
      referer: "https://storychain.ai/",
      origin: "https://storychain.ai",
      accept: "application/json, text/plain, */*",
      priority: "u=1, i",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "Windows",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    };
    this.config = config;
  }

  log(message, level = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const accountPrefix = `[${timestamp}][Tài khoản ${this.index + 1}]`;
    const colorsMap = {
      success: "green",
      error: "red",
      warning: "yellow",
      info: "blue",
    };
    console.log(colors[colorsMap[level]](accountPrefix + " " + message));
  }
  async random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  getRandomString(length) {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }
  async sleep(time) {
    await new Promise((resolve) => setTimeout(resolve, time));
  }
  async http(url, header = null, data = null, httpRetryModel = null) {
    try {
      const agent = this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null;

      const options = {
        headers: header ? { ...this.headers, header } : this.headers,
        timeout: 40000,
        httpsAgent: agent,
      };
      const axiosInstance = axios.create();
      if (!httpRetryModel) {
        httpRetryModel = new HttpRetryModel();
      }

      axiosRetry(axiosInstance, {
        retries: httpRetryModel.retries,
        retryDelay: httpRetryModel.retryDelay,
        retryCondition: httpRetryModel.retryCondition,
        onRetry: (retryCount, error, requestConfig) => {
          this.log(`Retry ${requestConfig.url}: ${retryCount}`, "error");
        },
      });
      const response = data
        ? await axiosInstance.post(url, data, options)
        : await axiosInstance.get(url, options);
      return response;
    } catch (error) {
      this.log(`HTTP error: ${error.message}`, "error");
      throw error;
    }
  }
  async checkToken(contract_token_input) {
    let balance_of_tokenInput = await this.web3.callReadOnlyContract(
      contract_token_input,
      abi_balance,
      "balanceOf",
      [this.address]
    );
    return parseInt(balance_of_tokenInput.toString());
  }

  async doTaskTokenTail() {
    for await (let i of contract_info) {
      this.log(`Check NFT ${i.name}`, "warning");
      const amount = await this.checkToken(i.CA);
      if (amount > 0) {
        this.log(`Đã có NFT`, "success");
      } else {
        const tx = await this.web3.callContract(
          i.CA,
          abi_safeMint,
          "safeMint",
          [this.web3.address],
          BigInt(0)
        );
        this.log(`Mint txHash: ${tx}`, "success");
      }
    }
  }
  async checkIP() {
    try {
      const response = await this.http("https://api.ipify.org?format=json");
      return response.data.ip;
    } catch (error) {
      return "Unknown IP";
    }
  }
  //#region ScorePlay
  async placebet(matchId, outcome, amount) {
    try {
      let tx = await this.web3.callContract(
        "0x19e80fBf3a9ec8Cc7B259786F183E7feC4F01287",
        abi_approve,
        "approve",
        ["0xb3904077B0437B024a0b5023926e7BE438cf7684", parseEther("10")],
        BigInt(0)
      );
      if (tx) {
        this.log(`Approve hash:${tx}`, "success");
        const txPlace = await this.web3.callContract(
          "0xb3904077B0437B024a0b5023926e7BE438cf7684",
          abi_placeBet,
          "placeBet",
          [matchId, outcome, parseEther(`${amount}`)],
          BigInt(0)
        );
        this.log(`placeBet tx ${txPlace}`, "success");
      }
    } catch (error) {
      this.log(`${error.message}`, "error");
    }
  }
  //#endregion
  async processAccount() {
    try {
      switch (this.input_program) {
        case 1:
          const balance = await this.web3.getBalance();
          this.log(`Wallet: ${this.web3.address} --  ${balance} CAMP`);
          fs.appendFileSync("balance.txt", `${this.web3.address}|${balance}\n`);
          break;
        case 2:
          await this.doTaskTokenTail();
          break;
        case 3:
          const balancetScore = await this.checkToken(
            "0x19e80fBf3a9ec8Cc7B259786F183E7feC4F01287"
          );
          const format = formatEther(`${balancetScore}`);
          this.log(`Wallet ${this.web3.address} balance ${format}`, "success");
          const matchId = process.env.MATCHID;
          const outcome = process.env.OUTCOME;
          const amount = process.env.AMOUNT;
          if (parseFloat(format) > amount) {
            await this.placebet(matchId, outcome, amount);
          } else {
            this.log(`insuficiant tScore`, "warning");
          }
          await this.sleep(5000);
          break;
        default:
          this.log("Chức năng không xác định, Vui lòng nhập lại", "warning");
          break;
      }
    } catch (error) {
      this.log(`Error processing account: ${error.message}`, "error");
    }
  }
}
async function getAccountIndexInput() {
  return new Promise((resolve) => {
    rl.question(
      "----Campnetwork by Chungmaster Tele: @chungmaster23 ---- \n" +
        "Nhập 1: Check Balance \n" +
        "Nhập 2: Mint NFT Token Tail \n" +
        "Nhập 3: ScorePlay \n" +
        "   Vui lòng nhập chức năng bạn muốn chọn:",
      (input) => {
        // Kiểm tra nếu người dùng nhập đúng định dạng
        const index = parseInt(input.trim(), 10);
        if (isNaN(index) || index < 1) {
          console.log("Vui lòng nhập một số hợp lệ.");
          resolve(getAccountIndexInput()); // Nếu nhập sai, yêu cầu nhập lại
        } else {
          resolve(index);
        }
      }
    );
  });
}
async function main() {
  const dataFile = path.join(__dirname, "data.txt");
  const configFile = path.join(__dirname, "config.json");

  if (!fs.existsSync(dataFile)) {
    console.log("data.txt file not found!");
    return;
  }

  const data = fs.readFileSync(dataFile, "utf8").split("\r\n").filter(Boolean);
  const proxys = fs
    .readFileSync("proxy.txt", "utf8")
    .split("\r\n")
    .filter(Boolean);
  const config = fs.existsSync(configFile)
    ? JSON.parse(fs.readFileSync(configFile, "utf8"))
    : { maxThreads: 5, waitMinutes: 1440 };
  const maxThreads = config.maxThreads || 5;
  const waitMinutes = config.waitMinutes || 1440;
  const input_program = await getAccountIndexInput();
  const accounts = data.map((line, index) => {
    const proxy = proxys[index];
    const privateKey = line;
    return new Account(index, privateKey, proxy, input_program, config);
  });

  while (true) {
    const queue = accounts.slice();
    const activeThreads = new Set();

    const runNext = async () => {
      if (queue.length === 0) return;
      const account = queue.shift();
      activeThreads.add(account);
      await account.processAccount();
      activeThreads.delete(account);
      runNext();
    };

    for (let i = 0; i < maxThreads && queue.length > 0; i++) {
      runNext();
    }

    while (activeThreads.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(
      `Hoàn thành tất cả tài khoản, chờ ${waitMinutes} phút để tiếp tục...`
    );
    await new Promise((resolve) =>
      setTimeout(resolve, waitMinutes * 60 * 1000)
    );
  }
}

class HttpRetryModel {
  constructor(
    retries = 3,
    retryDelay = () => {
      return 3000;
    },
    retryCondition = (error) => {
      error.code === "ECONNABORTED" || error.message.includes("timeout");
    }
  ) {
    this.retries = retries;
    this.retryDelay = retryDelay;
    this.retryCondition = retryCondition;
  }
}

main().catch(console.error);
