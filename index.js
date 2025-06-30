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
const abi_claimPayout = [
  {
    name: "claimPayout",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "matchId",
        type: "bytes32",
      },
    ],
    outputs: [],
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
const abi_mint_raible = [
  {
    name: "claim",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "a1", type: "address" },
      { name: "u1", type: "uint256" },
      { name: "a2", type: "address" },
      { name: "u2", type: "uint256" },
      {
        name: "data",
        type: "tuple",
        components: [
          { name: "proof", type: "bytes32[]" },
          { name: "amount", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "receiver", type: "address" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
];

//#region Raible
const contract_NFT_raible = process.env.NFT_RARIBLE_CONTRACT;
const amount_mint = parseInt(process.env.AMOUNT_MIN);
const price_NFT = parseFloat(process.env.PRICE);
//#endregion
//#region ScorePlay
const matchId_bet = process.env.MATCHID_BET;
let matchID_claim = process.env.MATCHID_CLAIM;
let outcome = parseInt(process.env.OUTCOME);
let amount = parseInt(process.env.AMOUNT);
//#endregion
//#region PANENKA_FC
let room_id = process.env.ROOM_ID;
let formation = process.env.FORMATION;
//#endregion

class Account {
  constructor(index, privateKey, proxy, input_program, team, email, config) {
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
      origin: "https://panenkafc.gg",
      accept: "application/json, text/plain, */*",
      Authorization: `Bearer ${email}`,
    };
    this.input_program = input_program;
    this.headers2 = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      "Accept-Language": "vi-VN,vi;q=0.9",
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
    this.account_id = "";
    this.email = email;
    this.config = config;
    this.team = team;
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
  s(e, t) {
    if (!/^(-?)([0-9]*)\.?([0-9]*)$/.test(e))
      throw new i({
        value: e,
      });
    let [r, n = "0"] = e.split("."),
      s = r.startsWith("-");
    if ((s && (r = r.slice(1)), (n = n.replace(/(0+)$/, "")), 0 === t))
      1 === Math.round(Number(`.${n}`)) && (r = `${BigInt(r) + 1n}`), (n = "");
    else if (n.length > t) {
      let [e, i, s] = [n.slice(0, t - 1), n.slice(t - 1, t), n.slice(t)],
        a = Math.round(Number(`${i}.${s}`));
      (n =
        a > 9
          ? `${BigInt(e) + BigInt(1)}0`.padStart(e.length + 1, "0")
          : `${e}${a}`).length > t &&
        ((n = n.slice(1)), (r = `${BigInt(r) + 1n}`)),
        (n = n.slice(0, t));
    } else n = n.padEnd(t, "0");
    return BigInt(`${s ? "-" : ""}${r}${n}`);
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
  async checkIP() {
    try {
      const response = await this.http("https://api.ipify.org?format=json");
      return response.data.ip;
    } catch (error) {
      return "Unknown IP";
    }
  }
  //#region TokenTail
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
  //#endregion

  //#region ScorePlay
  async placebet() {
    let try_count = 0;
    try {
      let tx = await this.web3.callContract(
        "0x19e80fBf3a9ec8Cc7B259786F183E7feC4F01287",
        abi_approve,
        "approve",
        ["0xb3904077B0437B024a0b5023926e7BE438cf7684", parseEther(`${amount}`)],
        BigInt(0)
      );
      if (tx) {
        this.log(`Approve hash:${tx}`, "success");
        await this.sleep(1000);
        while (try_count < 5) {
          const txPlace = await this.web3.callContract(
            "0xb3904077B0437B024a0b5023926e7BE438cf7684",
            abi_placeBet,
            "placeBet",
            [matchId_bet, outcome, parseEther(`${amount}`)],
            BigInt(0)
          );
          if (txPlace) {
            this.log(`placeBet tx ${txPlace}`, "success");
            break;
          } else {
            try_count++;
            this.log(`thử lại lần ${try_count}`, "error");
            await this.sleep(3000);
          }
        }
      }
    } catch (error) {
      try_count++;
      this.log(`${error.message} thử lại lần ${try_count}`, "error");
      await this.sleep(3000);
    }
  }
  async claimBet() {
    try {
      this.log(`Claim match ID ${matchID_claim}`, "warning");
      const txPlace = await this.web3.callContract(
        "0xb3904077B0437B024a0b5023926e7BE438cf7684",
        abi_claimPayout,
        "claimPayout",
        [matchID_claim],
        BigInt(0)
      );
      if (txPlace) {
        this.log(`Claim tx ${txPlace}`, "success");
      }
    } catch (error) {
      this.log(`${error.message}`, "error");
    }
  }
  //#endregion

  //#region Panenka FC

  tryBuildRandomTeam(players, costLimit = 100, maxAttempts = 1000) {
    const parseCostSafe = (cost) => {
      const parsed = parseFloat(cost);
      return isNaN(parsed) ? 0 : parsed;
    };

    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const valid = players.filter((p) => !p.injured);

    const GKPool = valid.filter((p) => p.position === "Goalkeeper");
    const DFPool = valid.filter((p) => p.position === "Defender");
    const MFPool = valid.filter((p) => p.position === "Midfielder");
    const FWPool = valid.filter((p) => p.position === "Attacker");

    if (GKPool.length < 2) {
      throw new Error("Không đủ 2 thủ môn để xây dựng đội hình.");
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const [starterGK, subGK] = shuffle(GKPool).slice(0, 2);
      if (!starterGK || !subGK || starterGK.id === subGK.id) continue;

      const defs = shuffle(DFPool).slice(0, 4);
      const mids = shuffle(MFPool).slice(0, 4);
      const atts = shuffle(FWPool).slice(0, 2);

      if (defs.length < 4 || mids.length < 4 || atts.length < 2) continue;

      const starters = [starterGK, ...defs, ...mids, ...atts];
      const usedIds = new Set(starters.map((p) => p.id));
      usedIds.add(subGK.id);

      // ✅ Không chọn thêm thủ môn làm dự bị nữa
      const subsPool = shuffle(
        valid.filter((p) => !usedIds.has(p.id) && p.position !== "Goalkeeper")
      );
      const subs = subsPool.slice(0, 3);

      if (subs.length < 3) continue;

      const fullTeam = [...starters, subGK, ...subs];
      fullTeam.forEach((p, idx) => {
        const role = idx < 11 ? "Đá chính" : "Dự bị";
        this.log(
          `${role} - ${p.position}: ${p.display_name} (${p.team_name})`,
          "success"
        );
      });
      const totalCost = fullTeam.reduce(
        (sum, p) => sum + parseCostSafe(p.cost),
        0
      );

      if (totalCost < costLimit) {
        return fullTeam.map((p, idx) => ({
          id: p.id,
          isSubstitute: idx >= 11,
          formation: idx + 1,
          isCaptain: idx === 1,
          isViceCaptain: idx === 2,
        }));
      }
    }

    throw new Error(
      "Không tìm được đội hình hợp lệ với chi phí < 100 sau nhiều lần thử."
    );
  }
  async LoginGameRoom() {
    try {
      const turnstileResult = await solveCaptcha();
      if (turnstileResult.data) {
        const turnstileToken = turnstileResult.data;
        console.log(turnstileToken);
        const payload = {
          email: this.email,
          password: "Chung2310@",
          turnstileToken: turnstileToken,
        };
        const response = await this.http(
          `https://prod-api.panenkafc.gg/api/v1/auth/login`,
          null,
          payload
        );
        if (response.status == 200 || response.status == 201) {
          this.headers = {
            ...this.headers,
            authorization: `Bearer ${response.data?.accessToken}`,
          };
          this.account_id = response.data?.data?.id;
          this.log(`Login success ${this.account_id}`, "success");
          return true;
        } else {
          return false;
        }
      }
    } catch (error) {
      if (error.response) {
        this.log(`${JSON.stringify(error.response.data)}`, "error");
      }

      return false;
    }
  }
  async getDetails() {
    try {
      const response = await this.http(
        `https://prod-api.panenkafc.gg/api/v1/users/user/details`
      );
      if (response.status == 200) {
        let address_wallet = null;
        for (let wallet of response.data.data.wallets) {
          if (wallet?.blockchain == "camp") {
            address_wallet = wallet?.address;
            break;
          }
        }
        if (address_wallet) {
          const balance = await this.web3.getBalance(address_wallet);
          this.log(`Wallet: ${address_wallet} --  ${balance} CAMP`);
        } else {
          this.log(`Không tìm thấy địa chỉ camp`);
        }
      }
    } catch (error) {
      if (error.response) {
        this.log(`${JSON.stringify(error.response.data)}`, "error");
      }
    }
  }
  async checkJoinGame() {
    try {
      const response = await this.http(
        `https://prod-api.panenkafc.gg/api/v1/game-rooms/${room_id}`
      );
      if (response.status == 200) {
        if (response.data.data?.has_joined) {
          return false;
        } else {
          if (response.data?.data?.lineup?.id) {
            this.log(
              `Join Line Up ${response.data?.data?.lineup?.id}`,
              "warning"
            );
            await this.JoinTeam(response.data?.data?.lineup?.id);
            return false;
          } else {
            return true;
          }
        }
      } else {
        return false;
      }
    } catch (error) {
      if (error.response) {
        this.log(
          `check Join Game ${JSON.stringify(error.response.data)}`,
          "error"
        );
      }
      return false;
    }
  }
  async JoinTeam(team_id) {
    try {
      await this.http(
        `https://prod-api.panenkafc.gg/api/v1/game-rooms/${room_id}/fixtures`
      );
      const response = await this.http(
        `https://prod-api.panenkafc.gg/api/v1/game-rooms/${room_id}/join`,
        null,
        {
          team: team_id,
        }
      );
      if (response.status == 200 || response.status == 201) {
        this.log(
          `Join Success${response.data?.date?.user_wallet_address}`,
          "success"
        );
      }
    } catch (error) {
      if (error.response) {
        this.log(
          `Catch JoinTeam ${JSON.stringify(error.response.data)}`,
          "error"
        );
      }
    }
  }
  async createTeam() {
    try {
      this.log(`Create team...`, "warning");
      const team_create = this.tryBuildRandomTeam(this.team);
      const payload = {
        players: team_create,
        name: this.getRandomString(10),
        game_room_id: room_id,
        formationId: formation,
      };
      let try_count = 0;
      while (try_count < 5) {
        try {
          const response = await this.http(
            `https://prod-api.panenkafc.gg/api/v1/teams`,
            null,
            payload
          );
          if (response.status == 200 || response.status == 201) {
            const team_id = response.data?.data?.id;
            await this.JoinTeam(team_id);
            break;
          } else {
            try_count++;
          }
        } catch (error) {
          if (error.response) {
            this.log(`${JSON.stringify(error.response.data)}`, "error");
            this.log(`Try index ${try_count} after 60s`, "error");
          }
          try_count++;
        }
        await this.sleep(60000);
      }
    } catch (error) {
      if (error.response) {
        console.log(error.response.data);
      }
      this.log(`Catch createTeam ${error.message}`, "error");
    }
  }
  async JoinGameRoom() {
    try {
      await this.getDetails();
      const isJoinGame = await this.checkJoinGame();
      if (isJoinGame) {
        await this.createTeam();
      } else {
        this.log(`Skip Join Game`, "warning");
      }
    } catch (error) {}
  }
  //#endregion

  //#region RairleBle
  async mintNFTRaible(amount_mint) {
    try {
      const params = [
        this.address,
        amount_mint,
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        parseEther(`${price_NFT}`),
        {
          proof: [],
          amount: 0n,
          nonce: (1n << 256n) - 1n,
          receiver: "0x0000000000000000000000000000000000000000",
        },
        "0x",
      ];
      const mint_data = await this.web3.callContract(
        contract_NFT_raible,
        abi_mint_raible,
        "claim",
        params,
        `${price_NFT}`
      );
      this.log(`Mint tx: ${mint_data}`, "success");
    } catch (error) {
      this.log(error.message);
    }
  }
  //#endregion

  //#region StoryAI
  async getPayloadLogin() {
    try {
      const response = await this.http(
        `https://api.storychain.ai/thirdweb/login?address=${this.address}&chainId=123420001114`
      );
      if (response.status == 200) {
        return response.data;
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch getPayload Login ${error.response.data}`, "error");
      }
      return false;
    }
  }
  createSign(e) {
    try {
      let n = [
        `${e.domain} wants you to sign in with your Ethereum account:`,
        e.address,
      ].join("\n");
      (n = [n, e.statement].join("\n\n")), e.statement && (n += "\n");
      let i = [];
      if (e.uri) {
        let n = `URI: ${e.uri}`;
        i.push(n);
      }
      let s = `Version: ${e.version}`;
      if ((i.push(s), e.chain_id)) {
        let n = `Chain ID: ${e.chain_id}` || "1";
        i.push(n);
      }
      let t = `Nonce: ${e.nonce}`;
      i.push(t);
      let u = `Issued At: ${e.issued_at}`;
      i.push(u);
      let o = `Expiration Time: ${e.expiration_time}`;
      if ((i.push(o), e.invalid_before)) {
        let n = `Not Before: ${e.invalid_before}`;
        i.push(n);
      }
      return (
        e.resources &&
          i.push(
            ["Resources:", ...e.resources.map((e) => `- ${e}`)].join("\n")
          ),
        [n, i.join("\n")].join("\n")
      );
    } catch (error) {
      return false;
    }
  }
  async signMessage() {
    try {
      const signLoginPayload = await this.getPayloadLogin();
      const signdata = this.createSign(signLoginPayload);
      const signature = await this.web3.sign_message(signdata);
      return {
        signature: signature.signature,
        payload: signLoginPayload,
      };
    } catch (error) {
      return false;
    }
  }
  async LoginStory() {
    try {
      const payload_login = await this.signMessage();
      const response = await axios.post(
        `https://api.storychain.ai/thirdweb/login`,
        payload_login,
        {
          headers: this.headers2,
          httpAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          httpsAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          timeout: 20000,
        }
      );
      if (response.status == 200) {
        const rawSetCookies = response.headers["set-cookie"]; // array
        const cookies = rawSetCookies
          .map((c) => c.split(";")[0]) // chỉ lấy phần `key=value`
          .join("; "); // nối lại thành 1 dòng
        this.headers2 = {
          ...this.headers2,
          Cookie: cookies,
        };
        return true;
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch LoginStory  ${error.response.data}`, "error");
      }
      return false;
    }
  }
  async handle_Login() {
    try {
      if (await this.LoginStory()) {
        const response = await axios.get(
          `https://api.storychain.ai/thirdweb/isLoggedIn`,
          {
            headers: this.headers2,
            httpAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
            httpsAgent: this.proxy
              ? new HttpsProxyAgent(`${this.proxy}`)
              : null,
            timeout: 20000,
          }
        );
        if (response.status == 200) {
          this.log(
            `User id ${response.data?.userId} -  ${response.data?.loggedIn} `,
            "success"
          );
          await this.checkSpin();
          await this.sleep(3000);
          await this.checkTicket();
          return true;
        }
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch handle_Login  ${error.response.data}`, "error");
      }
      return false;
    }
  }
  async checkSpin() {
    try {
      const response = await axios.get(
        `https://api.storychain.ai/users/can-spin`,
        {
          headers: this.headers2,
          httpAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          httpsAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          timeout: 20000,
        }
      );
      if (response.status == 200) {
        if (response.data.canSpin) {
          await this.Spin();
        } else {
          this.log(`Skip spin today`, "warning");
        }
      } else {
        return false;
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch checkSpin  ${error.response.data}`, "error");
      }
      return false;
    }
  }
  async Spin() {
    try {
      const response = await axios.post(
        `https://api.storychain.ai/users/spin-wheel`,
        {},
        {
          headers: this.headers2,
          httpAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          httpsAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          timeout: 20000,
        }
      );
      if (response.status == 200) {
        this.log(`${JSON.stringify(response.data)}`, "success");
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch checkSpin  ${error.response.data}`, "error");
      }
      return false;
    }
  }
  async checkTicket() {
    try {
      const response = await axios.get(`https://api.storychain.ai/tickets`, {
        headers: this.headers2,
        httpAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
        httpsAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
        timeout: 20000,
      });
      if (response.status == 200) {
        if (response.data.ticketStory > 0) {
          const characte_id = await this.getCharacter();
          this.log(`Creating story with character ${characte_id}`, "warning");
          await this.createStory(characte_id, "cow and buffalo");
        } else {
          this.log(`Skip create story today`, "warning");
        }
      } else {
        return false;
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch checkTicket  ${error.response.data}`, "error");
      }
      return false;
    }
  }
  async getCharacter() {
    try {
      const response = await axios.get(
        `https://api.storychain.ai/characters/me/available`,
        {
          headers: this.headers2,
          httpAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          httpsAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          timeout: 20000,
        }
      );
      if (response.status == 200) {
        return response.data?.characters[0]?._id;
      } else {
        return false;
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch getCharacter  ${error.response.data}`, "error");
      }
      return false;
    }
  }
  async createStory(id, prompt) {
    try {
      const response = await axios.post(
        `https://api.storychain.ai/stories/me/create`,
        { id: id, prompt: prompt },
        {
          headers: this.headers2,
          httpAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          httpsAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          timeout: 80000,
        }
      );
      if (response.status == 200) {
        this.log(`Story Id ${JSON.stringify(response.data?._id)}`, "success");
        this.log(
          `Story title ${JSON.stringify(response.data?.title)}`,
          "success"
        );
        this.log(
          `Story description ${JSON.stringify(response.data?.description)}`,
          "success"
        );
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch createStory  ${error.response.data}`, "error");
      } else {
        console.log(error.message);
      }
      return false;
    }
  }
  async checkStory(story_id) {
    try {
      const response = await axios.get(
        `https://api2.storychain.ai/stories/${story_id}`,
        {
          headers: this.headers2,
          httpAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          httpsAgent: this.proxy ? new HttpsProxyAgent(`${this.proxy}`) : null,
          timeout: 20000,
        }
      );
      if (response.status == 200) {
        for (let tx in response.data.mints) {
          this.log(
            `${tx?.storyId}- status: ${tx.status} - txhash: ${tx?.txHash}`,
            "success"
          );
        }
      } else {
        return false;
      }
    } catch (error) {
      if (error.response) {
        this.log(`Catch checkTicket  ${error.response.data}`, "error");
      }
      return false;
    }
  }
  //#endregion
  async processAccount() {
    try {
      switch (this.input_program) {
        case 1:
          const balance = await this.web3.getBalance(this.web3.address);
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
        case 4:
          await this.claimBet();
          await this.sleep(5000);
          break;
        case 5:
          const amountNFT = await this.checkToken(contract_NFT_raible);
          if (amountNFT < amount_mint) {
            const amountNFT_mint = amount_mint - amountNFT;
            await this.mintNFTRaible(amountNFT_mint);
            await this.sleep(6000);
          } else {
            this.log(`Wallet have ${amountNFT} NFT`, "warning");
          }
          break;
        case 6:
          await this.JoinGameRoom();
          await this.sleep(10000);
          break;
        case 7:
          await this.handle_Login();
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
        "Nhập 4: Claim Bet \n" +
        "Nhập 5: Mint NFT Raible \n" +
        "Nhập 6: Panenka FC \n" +
        "Nhập 7: StoryChain AI \n" +
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
async function getAccountIndexInputAccount() {
  return new Promise((resolve) => {
    rl.question(
      "Nhập số tài khoản bắt đầu (ví dụ: từ nick số 30): ",
      (input) => {
        // Kiểm tra nếu người dùng nhập đúng định dạng
        const index = parseInt(input.trim(), 10);
        if (isNaN(index) || index < 1) {
          console.log("Vui lòng nhập một số hợp lệ.");
          resolve(getAccountIndexInputAccount()); // Nếu nhập sai, yêu cầu nhập lại
        } else {
          resolve(index);
        }
      }
    );
  });
}

async function fetchAllPlayers() {
  let allPlayers = [];
  for (let page = 1; page <= 6; page++) {
    const res = await axios.get(
      `https://prod-api.panenkafc.gg/api/v1/fpl/players?page=${page}&take=20&sortBy=cost&sortOrder=DESC&league=3412&&clubs=83ec9230-f232-4590-a084-9ffc7228a690&clubs=5f52f93d-4cb0-4591-8d9d-98d051fc7694&clubs=7fc57993-5173-45de-b63c-0f5b68622ae6&clubs=f2fe378a-0271-43df-9a2d-35b592b8dfe7`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9,en-GB;q=0.8,en-CA;q=0.7",
          "content-type": "application/json",
          origin: "https://panenkafc.gg",
          accept: "application/json, text/plain, */*",
          authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE3NzcxNmNlLTM0NzItNDYxYi1hZGE2LTM0NGQwMzA4ODI2YyIsImVtYWlsIjoiYS5jLmNjc3QuZzc5cjQyN0BnbWFpbC5jb20iLCJ0eXBlIjoiYXV0aG9yaXphdGlvbiIsImlhdCI6MTc1MTE4Nzc2NiwiZXhwIjoxNzgyNzQ1MzY2LCJhdWQiOiJwYW5lbmthZmMuZ2ciLCJpc3MiOiJwYW5lbmthOmZjIiwic3ViIjoicGFuZW5rYTp1c2VyIn0.Yz0W4pY91eS6s0QBkEUWmNd2Kl-XUn-2H-G5nCxCSW4",
        },
      }
    );
    const data = res.data;
    if (data.success && data.data.length > 0) {
      allPlayers.push(...data.data);
    }
  }
  return allPlayers;
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
  let allPlayers = [];
  if (input_program == "6") {
    allPlayers = await fetchAllPlayers();
  }
  const accounts = data.map((line, index) => {
    const proxy = proxys[index];
    const [privateKey, email] = line.split("|");
    return new Account(
      index,
      privateKey,
      proxy,
      input_program,
      allPlayers,
      email,
      config
    );
  });
  const startIndex = await getAccountIndexInputAccount();
  const accountsToProcess = accounts.slice(startIndex - 1);
  while (true) {
    const queue = accountsToProcess.slice();
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
