const Service = require('egg').Service;
const moment = require('moment');

class RanksService extends Service {

  async getKeywords() {
    let result = await this.app.mysql.select('jd_keywords', { orders: ['sort'] });
    const keywords = [];
    result.map((item) => {
      keywords.push(item.keyword);
    });
    return keywords;
  }

  async getMyRank(date, brand = '', keyword = '', sort = 0) {
    const { ctx } = this;
    if (!brand || !keyword) return;
    const dts = moment(date).format('YYYYMMDDHH');
    const filter = { dts, keyword, brand, sort };
    const result = await this.app.mysql.select('jd_myRank', { where: filter });
    if (result && result.length !== 0) {
      ctx.logger.info(`get my rank by db, filter:${JSON.stringify(filter)}, count:${result.length}`);
    }
    return result || [];
  }

  async fromRankToMyRank(date, brand = '', keyword = '', sort = 0) {
    const { ctx } = this;
    if (!brand || !keyword) return;
    const dts = moment(date).format('YYYYMMDDHH');
    const filter = { dts, keyword, brand, sort };
    const result = await this.getMyRank(date, brand, keyword, sort);
    if (result && result.length !== 0) {
      return;
    }
    const list = await this.list(date, keyword, sort);
    if (list && list.length === 0) {
      return;
    }
    const insertItems = [];
    list.map(item => {
      if (item.title.includes(brand)) {
        const { skuId, imageUrl, title, page, pageRank } = item;
        const dbItem = Object.assign({ skuId, imageUrl, title, page, pageRank }, filter);
        insertItems.push(dbItem);
      }
    });
    if (insertItems.length > 0) {
      //通过事务一次提交所有记录
      const insertResult = await this.app.mysql.beginTransactionScope(async conn => {
        insertItems.map(item => {
          (async () => {
            await conn.insert('jd_myRank', item);
          })();
        });
        return { success: true };
      }, ctx);
      ctx.logger.info(`set my rank into db, success:${insertResult.success}, filter:${JSON.stringify(filter)}, count:${insertItems.length}`);
    } else {
      // 如果没有入榜，插入一条skuId为0的记录，防止重复查询主排名库
      const dbItem = Object.assign({ skuId: 0 }, filter);
      await this.app.mysql.insert('jd_myRank', dbItem);
    }
    return insertItems;
  }


  async list(date, keyword = '', sort = 0) {
    const { ctx } = this;
    // 从db或接口读取数据
    const dts = moment(date).format('YYYYMMDDHH');
    const filter = { dts, keyword, sort };
    const result = await this.app.mysql.select('jd_rank', { where: filter });
    if (result && result.length !== 0) {
      ctx.logger.info(`get rank by db, filter:${JSON.stringify(filter)}, count:${result.length}`);
    }
    return result || [];
  }

  async spiderToDB(filter, count = 1000) {
    const { ctx } = this;
    const { sort, keyword, dts } = filter;
    const { serverUrl } = this.config.jd;
    const fullList = [];
    for (let i = 0; i < Math.ceil(count / 10); i++) {
      const page = i + 1;
      // 如果非当前时间段内，则跳过
      if (moment(new Date()).format('YYYYMMDDHH') !== dts) {
        return { success: false, message: '不在当前时间段' };
      }
      const url = `${serverUrl}/ware/searchList.action`;
      const params = {
        _format_: 'json',
        sort: sort,
        page: page,
        keyword: keyword
      };
      const pageData = await ctx.fetchData(url, params, 3);
      // 将解新后日志写入文件
      if (!pageData) {
        ctx.logger.warn(`获取数据失败，跳过, url:${url}, data:${JSON.stringify(pageData)}`);
        continue;
      }
      // 解析出需要的内容
      const pageList = this.parseList(pageData);
      let rank = 1;
      pageList.map((item) => {
        // 有曝光url的为广告，排除
        if (!item.exposalUrl) {
          fullList.push(Object.assign(item, { page: page, pageRank: rank }));
          rank++;
        }
      });
    }
    ctx.logger.info(`get rank by api, filter:${JSON.stringify(filter)}, count:${fullList.length}`);
    // 对原始数据进行处理，拿到最终想要写入DB的结果
    const insertItems = [];
    for (let i = 0; i < fullList.length; i++) {
      const item = fullList[i];
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
      insertItems.push(dbItem);
    }
    // 事务写DB
    if (insertItems.length > 0) {
      const insertResult = await this.app.mysql.beginTransactionScope(async conn => {
        insertItems.map(item => {
          (async () => {
            await conn.insert('jd_rank', item);
          })();
        });
        return { success: true };
      }, ctx);
      ctx.logger.info(`set rank into db, success:${insertResult.success}, filter:${JSON.stringify(filter)}, count:${insertItems.length}`);
    }
    return { success: true };
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

}

module.exports = RanksService;