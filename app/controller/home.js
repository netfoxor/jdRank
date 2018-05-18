'use strict';

const Controller = require('egg').Controller;
const moment = require('moment');

class HomeController extends Controller {
  async index() {
    const { ctx, service } = this;
    const { query } = ctx;
    const { keyword, sort, brand, sku, beginDateStr, endDateStr } = query;
    if (!keyword || !sort) {
      ctx.status = 501;
      return;
    }
    // 开始时间，默认为12小时前
    let beginDate = null;
    if (beginDateStr) {
      beginDate = moment(beginDateStr);
    }
    if (!beginDate || !beginDate.isValid()) {
      beginDate = moment().subtract(24, 'hours');
    }
    // 结束时间，默认为当前时间
    let endDate = moment(endDateStr);
    if (!endDate.isValid()) {
      endDate = moment();
    }
    // 计算时间差，循环请求
    const diff = endDate.diff(beginDate, 'hours');
    let result = [];
    const skuIds = [];
    const series = [];
    let xAxis = [];
    if (diff > 0) {
      let currentDate = moment(beginDate);
      for (let i = 0; i < diff; i++) {
        currentDate.add(1, 'hours');
        let list = await service.ranks.getMyRank(currentDate.toDate(), brand, keyword, sort);
        //添加时间
        list.map(item => {
          if (!item.time) {
            item.time = moment(item.id, 'YYYYMMDDHH').toDate();
          }
        });
        result = result.concat(list);
        xAxis.push(currentDate.format('YYYYMMDDHH'));
      }
      // 取出组key
      result.map((item) => {
        if (!skuIds.includes(item.skuId)) {
          skuIds.push(item.skuId);
        }
      });
      // 根据时间分组
      skuIds.map(skuId => {
        const group = { name: skuId, type: 'line', data: [] };
        const noRankValue = '';
        series.push(group);
        xAxis.map(dts => {
          let matchedItem = null;
          result.map((item) => {
            if (skuId === item.skuId && dts === item.dts) {
              matchedItem = item;
            }
          });
          const rank = matchedItem ? ((matchedItem.page - 1) * 10 + matchedItem.pageRank) : noRankValue;
          group.data.push(rank);
        });
      })
    }
    ctx.body = { query, xAxis, legend: skuIds, series, data: result };
  }

  async getKeywords() {
    const { ctx, service } = this;
    ctx.body = { keywords: await service.ranks.getKeywords() };
  }

  async taskRun() {
    const { ctx } = this;
    const { task } = ctx.query;
    ctx.app.runSchedule(task);
    ctx.body = { success: true };
  }

  async getMyRankTask() {
    const { ctx, service } = this;
    const { beginDateStr } = ctx.query;
    let beginDate = null;
    if (beginDateStr) {
      beginDate = moment(beginDateStr);
    }
    if (!beginDate || !beginDate.isValid()) {
      beginDate = moment().subtract(24, 'hours');
    }
    const diff = moment().diff(beginDate, 'hours');
    const keywords = await this.ctx.service.ranks.getKeywords();
    const currentDate = moment(beginDate);
    for (let i = 0; i <= diff; i++) {
      for (let j = 0; j < keywords.length; j++) {
        const keyword = keywords[j];
        for (let sort = 0; sort <= 1; sort++) {
          await service.ranks.fromRankToMyRank(currentDate, '派雅度', keyword, sort);
        }
      }
      currentDate.add(1, 'hours');
    }
  }
}

module.exports = HomeController;
