require 'mechanize'
require 'pry-byebug'

scraper = Mechanize.new
scraper.user_agent_alias = 'Windows Chrome'
scraper.history_added = Proc.new { sleep 0.5 }
result = []
(1..100).each do |page|
  puts page

=begin
  address = "http://www.kuaidaili.com/free/outha/#{page}/"
  scraper.get(address) do |search_page|
    (1..15).each do |i|
      ip = search_page.search("#list > table > tbody > tr:nth-child(#{i}) > td:nth-child(1)")
      port = search_page.search("#list > table > tbody > tr:nth-child(#{i}) > td:nth-child(2)")
      result << "#{ip.inner_text}:#{port.inner_text}"
    end
  end
=end


  address = "http://www.xicidaili.com/nn/#{page}"
  scraper.get(address) do |search_page|
    (2..101).each do |i|
      ip = search_page.search("#ip_list > tr:nth-child(#{i}) > td:nth-child(2)")
      port = search_page.search("#ip_list > tr:nth-child(#{i}) > td:nth-child(3)")
      result <<  "#{ip.inner_text}:#{port.inner_text}"
    end
  end
=begin
  address = "http://www.goubanjia.com/free/gwgn/index#{page}.shtml"
  scraper.get(address) do |search_page|
    (1..15).each do |i|
      ip = search_page.search("#list > table > tbody > tr:nth-child(#{i}) > td.ip > span,#list > table > tbody > tr:nth-child(#{i}) > td.ip > div").inner_text
      port = search_page.search("#list > table > tbody > tr:nth-child(#{i}) > td.ip > span:last-child").inner_text
      leng = port.length
      (1..leng).each do |i|
        ip = ip.chop
      end
      result << "#{ip}:#{port}"
    end
  end
=end


  File.new("proxies.json", "w")
  File.open("proxies.json", "w"){
   |file| file.write(result)
  }
end