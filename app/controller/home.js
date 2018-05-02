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
        let list = await service.ranks.list(currentDate.toDate(), keyword, sort, 1000);
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
        let lastRank = 1001;
        series.push(group);
        xAxis.map(tid => {
          let matchedItem = null;
          result.map((item) => {
            if (skuId === item.skuId && tid === item.id) {
              matchedItem = item;
            }
          });
          lastRank = matchedItem ? ((matchedItem.page - 1) * 10 + matchedItem.pageRank) : lastRank;
          group.data.push(lastRank);
        });
      })
    }
    ctx.body = { query: query, xAxis, legend: skuIds, series: series, data: result };
  }

  async taskRun() {
    const ctx = this;
    ctx.app.runSchedule('spider');
    ctx.body = 'success';
    ctx.status = 200;
  }
}

module.exports = HomeController;
