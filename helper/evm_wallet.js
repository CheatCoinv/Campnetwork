import Web3 from "web3";
import Web3HttpProvider from "web3-providers-http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { parseEther } from "ethers";

const RPC = "https://rpc.basecamp.t.raas.gelato.cloud"; //"https://rpc.basecamp.t.raas.gelato.cloud";

export class Evm {
  constructor(private_key, proxy_url) {
    // if (proxy_url) {
    //   const customHttpProvider = new Web3HttpProvider(RPC, {
    //     providerOptions: { agent: new HttpsProxyAgent(proxy_url) },
    //   });
    //   this.web3 = new Web3(customHttpProvider);
    // } else {
    //   this.web3 = new Web3(new Web3.providers.HttpProvider(RPC));
    // }
    this.web3 = new Web3(new Web3.providers.HttpProvider(RPC));
    this.private_key = private_key;
    this.address =
      this.web3.eth.accounts.privateKeyToAccount(private_key).address;
  }
  async getBalance(address) {
    try {
      const balance = await this.web3.eth.getBalance(address);
      return this.web3.utils.fromWei(balance, "ether");
    } catch (error) {
      console.error(error);
      return 0;
    }
  }
  async callReadOnlyContract(contractAddress, abi, method, params) {
    try {
      const contract = new this.web3.eth.Contract(abi, contractAddress);
      const result = await contract.methods[method](...params).call();
      return result;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }
  async callContract(contractAddress, abi, method, params, fee) {
    try {
      const contract = new this.web3.eth.Contract(abi, contractAddress);
      const data = contract.methods[method](...params).encodeABI();
      let gasEstimate = 300000;
      try {
        gasEstimate = await this.web3.eth.estimateGas({
          from: this.address,
          to: contractAddress,
          data: data,
          value: this.web3.utils.toWei(fee, "ether"),
        });
      } catch (error) {
        if (error?.cause?.data == "0x646cf558") {
          console.log(`Trận ko hợp lệ`);
        } else {
          console.log(`Lỗi ${error?.cause?.data}`);
        }
      }

      const gasPrice = await this.web3.eth.getGasPrice();
      const tx = {
        from: this.address,
        to: contractAddress,
        gas: gasEstimate,
        gasPrice: gasPrice,
        data: data,
        value: this.web3.utils.toWei(fee, "ether"),
      };
      const signedTx = await this.web3.eth.accounts.signTransaction(
        tx,
        this.private_key
      );
      const receipt = await this.web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );
      return receipt.transactionHash;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }
  async sign_message(message) {
    try {
      const signature = await this.web3.eth.accounts.sign(
        message,
        this.private_key
      );
      return signature;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }
}
