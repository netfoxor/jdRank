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
    const result = await ctx.service.ranks.list(new Date(), keyword, sort, 1000);
    ctx.body = result;
  }
}

module.exports = HomeController;
