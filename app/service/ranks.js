// app/service/news.js
const Service = require('egg').Service;

class RanksService extends Service {
  async list(keyword = '', sort = 0, page = 1) {
    // read config
    const { serverUrl } = this.config.jd;

    const { data } = await this.ctx.curl(`${serverUrl}/ware/searchList.action`, {
      method: 'POST',
      data: {
        _format_: 'json',
        sort: sort,
        page: page,
        keyword: keyword
      },
      dataType: 'json',
    });

    const list = this.parseList(data);
    const result = [];
    list.map((item) => {
      result.push({ skuId: item.wareId, title: item.wname, totalCount: item.totalCount, imageUrl: item.imageurl, price: item.jdPrice });
    });

    return result;
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