'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index(ctx) {
    const { query } = ctx;
    const { keyword, sort, brand, beginDateStr, endDateStr } = query;
    if (!keyword || !sort) {
      ctx.body = '非法参数';
      return;
    }
    let result = await ctx.service.ranks.list(new Date(), keyword, sort, 1000);
    if (brand) {
      result = result.filter((item) => {
        return item && item.title && item.title.includes(brand);
      });
    }
    ctx.body = result;
  }
}

module.exports = HomeController;
