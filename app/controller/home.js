'use strict';

const Controller = require('egg').Controller;
const moment = require('moment');

class HomeController extends Controller {
  async index() {
    const ctx = this;
    const { query } = ctx;
    const { keyword, sort, brand, sku, beginDateStr, endDateStr } = query;
    if (!keyword || !sort) {
      ctx.body = '非法参数';
      return;
    }
    // 开始时间，默认为12小时前
    let beginDate = null;
    if (beginDateStr) {
      beginDate = moment(beginDateStr);
    }
    if (!beginDate || !beginDate.isValid()) {
      beginDate = moment().subtract(12, 'hours');
    }
    // 结束时间，默认为当前时间
    let endDate = moment(endDateStr);
    if (!endDate.isValid()) {
      endDate = moment();
    }
    // 计算时间差，循环请求
    const diff = endDate.diff(beginDate, 'hours');
    let result = [];
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        let list = await ctx.service.ranks.list(beginDate.add(1, 'hours').toDate(), keyword, sort, 1000);
        if (brand) {
          list = list.filter((item) => {
            return item && item.title && item.title.includes(brand);
          });
        }
        if (sku) {
          list = list.filter((item) => {
            return item && item.skuId && item.skuId === sku;
          });
        }
        result = result.concat(list);
      }
    }
    ctx.body = result;
  }

  async taskRun() {
    const ctx = this;
    ctx.app.runSchedule('spider');
    ctx.body = 'success';
    ctx.status = 200;
  }
}

module.exports = HomeController;
