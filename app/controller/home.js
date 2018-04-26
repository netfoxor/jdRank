'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index(ctx) {
    const { query } = ctx;
    const { keyword, sort } = query;
    if (!keyword || !sort) {
      ctx.body = '非法参数';
      return;
    }
    let result = [];
    for (let i = 0; i < 20; i++) {
      const tmpData = await ctx.service.ranks.list(keyword, sort, i + 1);
      result = result.concat(tmpData);
    }
    ctx.body = result;
  }
}

module.exports = HomeController;
