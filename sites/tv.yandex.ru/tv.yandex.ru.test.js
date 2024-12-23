const { parser, url, request } = require('./tv.yandex.ru.config.js')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(customParseFormat)
dayjs.extend(utc)

jest.mock('axios')

const date = dayjs.utc('2023-11-26').startOf('d')
const channel = {
  site_id: '16',
  xmltv_id: 'ChannelOne.ru'
}
axios.get.mockImplementation((url, opts) => {
  if (url === 'https://tv.yandex.ru/?date=2023-11-26&grid=all&period=all-day') {
    return Promise.resolve({
      headers: {},
      data: fs.readFileSync(path.resolve(__dirname, '__data__/content.html'))
    })
  }
  if (url === 'https://tv.yandex.ru/api/120809?date=2023-11-26&grid=all&period=all-day') {
    return Promise.resolve({
      headers: {},
      data: JSON.parse(fs.readFileSync(path.resolve(__dirname, '__data__/schedule.json')))
    })
  }
  if (url === 'https://tv.yandex.ru/api/120809/main/chunk?page=0&date=2023-11-26&period=all-day&offset=0&limit=11') {
    return Promise.resolve({
      headers: {},
      data: JSON.parse(fs.readFileSync(path.resolve(__dirname, '__data__/schedule0.json')))
    })
  }
  if (url === 'https://tv.yandex.ru/api/120809/event?eventId=217749657&programCoId=') {
    return Promise.resolve({
      headers: {},
      data: JSON.parse(fs.readFileSync(path.resolve(__dirname, '__data__/program.json')))
    })
  }
})

it('can generate valid url', () => {
  expect(url({ date })).toBe(
    'https://tv.yandex.ru/?date=2023-11-26&grid=all&period=all-day'
  )
})

it('can generate valid request headers', () => {
  expect(request.headers).toMatchObject({
    Cookie:
      'cycada=3w11iWu+2+o6iIIiI/S1/k9lFIb6y+G6SW6hsbLoPJg=; ' +
      'i=0nUBW1d6GpFmpLRIuHYGulEA4alIC2j4WS+WYGcusydL7lcrG9loWX8qrFEBOqg54KZxGwCVaZhZ1THYgoIo0T69iCY=; ' +
      'spravka=dD0xNzAxMjI3MTk1O2k9MzYuODQuOTguMTcxO0Q9Njk4NDQwRkRDODk5QUEzMDJCNzI5NTJBMTM4RTY2ODNEMzQyNkM1MjI5QTkyNDI3NUJGMzMzQUJEMUZFQjMyQzczM0I2QzE0QTRDQkJFODY5Nzk0MjhGNkEzQjQ5NDJBMzcxQzIzMjE3RTRENkVDOUU1NEE1RDVFNDg0RUQ1RTI3OUNGNzlCMEYzNzUyMDcyNDhGQkVCNkIyMDg5NTMwMzc1QkZEQTlGNEU7dT0xNzAxMjI3MTk1NDg5NDIyODkzO2g9OTRmN2FiNTMxZmJjNDg5MjM4ZDk4Y2ZkN2E0ZmY0YmI=; ' +
      'yandexuid=7536067781700842414; ' +
      'yashr=7271154091700842416; ' +
      'user_display=696'
  })
})

it('can parse response', async () => {
  const content = fs.readFileSync(path.resolve(__dirname, '__data__/content.html'))
  const result = (
    await parser({ content, date, channel })
  ).map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(result).toMatchObject([
    {
      start: '2023-11-26T01:35:00.000Z',
      stop: '2023-11-26T02:10:00.000Z',
      title: 'ПОДКАСТ.ЛАБ. Мелодии моей жизни',
      category: 'досуг',
      description: 'Впереди вся ночь и есть о чем поговорить. Фильмы, музыка, любовь, звезды, еда, мода, анекдоты, спорт, деньги, настоящее, будущее - все это в творческом эксперименте.\nЛариса Гузеева читает любовные письма. Леонид Якубович рассказывает, кого не берут в пилоты. Арина Холина - какой секс способен довести до мужа или до развода. Валерий Сюткин на ходу сочиняет песню для Карины Кросс и Вали Карнавал. Дмитрий Дибров дарит новую жизнь любимой \"Антропологии\". Денис Казанский - все о футболе, хоккее и не только.\n\"ПОДКАСТЫ. ЛАБ\" - серия подкастов разной тематики, которые невозможно проспать. Интеллектуальные дискуссии после полуночи с самыми компетентными экспертами и актуальными спикерами.'
    }
  ])
})

it('can handle empty guide', async () => {
  const result = await parser({
    date,
    channel,
    content: '<!DOCTYPE html><html><head></head><body></body></html>'
  })
  expect(result).toMatchObject([])
})
