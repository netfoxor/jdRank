const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const low = require('lowdb');
const moment = require('moment');
const FileSync = require('lowdb/adapters/FileSync');

class RanksService extends Service {
  async list(date, keyword = '', sort = 0, count = 1000) {
    const ctx = this;
    // 从db或接口读取数据
    const id = moment(date).format('YYYYMMDDHH');
    const filter = { id, keyword, sort };
    let result;
    // // 读取db
    // const db = this.getDB();
    // result = db.get('rankItem').filter(filter).value();
    // // 如果db有数据，直接返回
    // if (result && result.length > 0) {
    //   ctx.logger.info(`get db, filter:${JSON.stringify(filter)}`);
    //   return result;
    // }
    ctx.logger.info(`get api or log file, filter:${JSON.stringify(filter)}`);
    result = await this.getAipData(filter, count, date);
    return result;
  }

  async getAipData(filter, count = 1000, date = new Date()) {
    const ctx = this;
    const { sort, keyword, id } = filter;
    const { serverUrl } = this.config.jd;
    const originList = [];
    const logDir = `${keyword}/${moment(date).format('YYYYMMDDHH')}`;
    for (let i = 0; i < Math.ceil(count / 10); i++) {
      const page = i + 1;
      const file = `./data/logs/${logDir}/${keyword}-${sort}-${id}-${page}.json`;
      let data = this.readLog(file);
      // 迁移数据
      if (!data) {
        const logDirOld = `${keyword}/${moment(date).format('YYYYMMDD')}`;
        const fileOld = `./data/logs/${logDirOld}/${keyword}-${sort}-${id}-${page}.json`;
        data = this.readLog(fileOld);
        if (data) {
          this.writeLog(file, data);
        }
      }
      // 本地没有取得数据，需要请求api
      if (!data) {
        // 如果非当前时间段内，则跳过
        if (moment(new Date()).format('YYYYMMDDHH') !== id) {
          continue;
        }
        const url = `${serverUrl}/ware/searchList.action`;
        const params = {
          _format_: 'json',
          sort: sort,
          page: page,
          keyword: keyword
        };
        data = await this.request(url, params);
        // 将解新后日志写入文件
        if (!data) {
          ctx.logger.warn(`获取数据失败，跳过, url:${url}, data:${JSON.stringify(data)}`);
          continue;
        }
        this.writeLog(file, data);
      }
      // 解析出需要的内容
      const list = this.parseList(data);
      let rank = 1;
      list.map((item) => {
        // 有曝光url的为广告，排除
        if (!item.exposalUrl) {
          originList.push(Object.assign(item, { page: page, pageRank: rank }));
          rank++;
        }
      });
      ctx.logger.info(`page:${page}, originList.length:${originList.length}`);
    }
    // 取得db
    const db = this.getDB();
    // 对原始数据进行处理，拿到最终想要的结果，写入db并返回
    const result = [];
    originList.map((item) => {
      // 输出结果用
      const a = {
        page: item.page,
        pageRank: item.pageRank,
        skuId: item.wareId,
        title: item.wname,
        totalCount: item.totalCount,
        imageUrl: item.imageurl,
        price: item.jdPrice
      };
      const b = Object.assign({}, a, filter);
      result.push(b);
      // db.get('rankItem').push(b).write();
    });
    return result;
  }

  getDB() {
    this.createFile('./data/db.json');
    const adapter = new FileSync('./data/db.json');
    const db = low(adapter);
    db.defaults({ rankItem: [] }).write();
    return db;
  }

  readLog(fileStr) {
    const absFilePath = path.resolve(fileStr);
    if (fs.existsSync(absFilePath)) {
      const content = fs.readFileSync(fileStr, 'utf-8');
      if (content) return JSON.parse(content);
    }
  }

  async request(url, data, retryTimes = 1) {
    const ctx = this;
    if (retryTimes > 3) {
      return null;
    }
    if (retryTimes > 1) {
      ctx.logger.warn(`重试中, url:${url}, data:${JSON.stringify(data)}, retryTimes:${retryTimes}`);
    }
    let response = null;
    try {
      response = await this.ctx.curl(url, {
        method: 'POST',
        data: data,
        dataType: 'json',
      });
    } catch (e) {
      ctx.logger.error(new Error(`请求出错了, url:${url}, data:${JSON.stringify(data)}, retryTimes:${retryTimes}`));
    }
    if (!response || response.status !== 200) {
      return await this.request(url, data, ++retryTimes);
    }
    return response.data;
  }

  writeLog(fileStr, data) {
    fs.writeFileSync(this.createFile(fileStr), JSON.stringify(data));
  }

  createFile(fileStr) {
    const absFilePath = path.resolve(fileStr);
    const dir = path.dirname(absFilePath);
    this.mkdirsSync(dir);
    if (!fs.existsSync(absFilePath)) {
      fs.writeFileSync(absFilePath, '');
    }
    return absFilePath;
  }

  parseList(data) {
    if (data && data.value) {
      const listData = JSON.parse(data.value);
      if (listData && listData.wareList && listData.wareList.wareList) {
        return listData.wareList.wareList;
      }
    }
    return [];
  }

  //递归创建目录 同步方法
  mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
      return true;
    } else {
      if (this.mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
      }
    }
  }
}

module.exports = RanksService;