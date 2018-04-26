const Service = require('egg').Service;
var fs = require('fs');
const low = require('lowdb');
const moment = require('moment');
const FileSync = require('lowdb/adapters/FileSync');

class RanksService extends Service {
  async list(keyword = '', sort = 0, page = 1) {
    if (!fs.existsSync('./data/')) {
      fs.mkdirSync('./data/');
    }
    if (!fs.existsSync('./data/db.json')) {
      fs.writeFileSync('./data/db.json', '');
    }
    const adapter = new FileSync('./data/db.json');
    const db = low(adapter);
    db.defaults({ rankItem: [] }).write();
    const id = moment().format('YYYYMMDDHH');
    const where = { id, keyword, sort, page };
    let result = db.get('rankItem').filter(where).value();
    if (result && result.length > 0) {
      console.log('get db...', where);
      return result;
    }
    console.log('get jd api...', where);
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
    const tmpResult = [];
    list.map((item) => {
      const a = { skuId: item.wareId, title: item.wname, totalCount: item.totalCount, imageUrl: item.imageurl, price: item.jdPrice };
      const b = Object.assign({}, a, where);
      tmpResult.push(a);
      db.get('rankItem').push(b).write();
    });
    result = tmpResult;
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