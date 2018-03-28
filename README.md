# Redis-based Free proxy server management
### Tech Stack
Node.JS, Redis, Async
### How to use
#### proxycrawler.rb
- Input: Nothing
  - You can configure it by your own, add the free high-anonymous proxy list website and their crawl rules)
- Output: proxies.json, the IP:port address of crawled proxies

#### config.json
Has the different _user-agent_ headers. Used while sending requests. 

#### checkProxies.js
Test all the crawled proxies on your _designated website_ (in our case, craigslist) in order to check its availability. 

- Input: proxies.json (generated by _proxycrawler.rb_)
- Parameters (You can change them during use):
  - Designated website: craigslist
  - Initial validity: 1000
  - Async map limit: 500 (send 500 requests at a time)
  - Timeout
  - Shortest / Longest: The predicted length of the _designated website_ URL
- Output: Push all the available proxies into Redis in-memory database.

### Design
#### Real-world problem
A lot of websites (e.x. craigslist) block the web crawlers as they repeatedly send request from the same IP. 
#### Analysis
Use free proxies. Crawl them from web and check their validity first. We only use proxies proven valid for web crawler. 
#### Design
- For valid proxies, we give them an initial score, saved in Redis zset, using proxy as key & score as value. 
- For each successful request, we increase the score, and vice versa. 
- When the score became 0, the proxy became invalid and the invalid proxies will be removed. 
- For efficiency, we send requests in thousands by async I/O. 
