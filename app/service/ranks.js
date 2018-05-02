const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const low = require('lowdb');
const moment = require('moment');
const FileSync = require('lowdb/adapters/FileSync');

class RanksService extends Service {
  async list(date, keyword = '', sort = 0, count = 1000, isSpider = false) {
    const ctx = this;
    // 从db或接口读取数据
    const id = moment(date).format('YYYYMMDDHH');
    const filter = { id, keyword, sort };
    let result = await this.app.mysql.select('jd_rank', { where: filter });
    // 如果db有数据，直接返回
    if (result && result.length >= 990) {
      ctx.logger.info(`get db, filter:${JSON.stringify(filter)}`);
      return result;
    }
    ctx.logger.info(`spider data, filter:${JSON.stringify(filter)}`);
    result = await this.getAipData(filter, count, date, isSpider);
    return result;
  }

  async getAipData(filter, count = 1000, date = new Date(), isSpider) {
    const ctx = this;
    const { sort, keyword, id } = filter;
    const { serverUrl } = this.config.jd;
    const originList = [];
    const logDir = `${keyword}/${moment(date).format('YYYYMMDDHH')}`;
    for (let i = 0; i < Math.ceil(count / 10); i++) {
      const page = i + 1;
      const file = `${ctx.config.dataPath}data/logs/${logDir}/${keyword}-${sort}-${id}-${page}.json`;
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
      if (!data && isSpider) {
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
    // 对原始数据进行处理，拿到最终想要的结果，写入db并返回
    const result = [];
    for (let i = 0; i < originList.length; i++) {
      const item = originList[i];
      // db查寻
      const dbFilter = Object.assign({}, { page: item.page, pageRank: item.pageRank }, filter);
      // 输出结果用
      const dbResult = {
        skuId: item.wareId,
        title: item.wname,
        totalCount: Number(item.totalCount),
        imageUrl: item.imageurl,
        price: Number(item.jdPrice),
      };
      const dbItem = Object.assign({}, dbResult, dbFilter);
      result.push(dbItem);
      const isFind = await this.app.mysql.get('jd_rank', dbFilter);
      if (!isFind) {
        await this.app.mysql.insert('jd_rank', dbItem);
      }
    }
    return result;
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