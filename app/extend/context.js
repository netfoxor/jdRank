// app/extend/context.js
module.exports = {
  // 带重试机制的请求
  async fetchData(url, data, maxRetryTimes = 1, retryTimes = 1) {
    const ctx = this;
    if (retryTimes > maxRetryTimes) {
      return null;
    }
    if (retryTimes > 1) {
      ctx.logger.warn(`重试中, url:${url}, data:${JSON.stringify(data)}, retryTimes:${retryTimes}`);
    }
    let response = null;
    try {
      response = await ctx.curl(url, {
        method: 'POST',
        data: data,
        dataType: 'json',
      });
    } catch (e) {
      ctx.logger.error(new Error(`请求出错了, url:${url}, data:${JSON.stringify(data)}, retryTimes:${retryTimes}`));
    }
    if (!response || response.status !== 200) {
      return await ctx.request(url, data, maxRetryTimes, ++retryTimes);
    }
    return response.data;
  }
};
