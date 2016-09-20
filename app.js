const request = require('request-promise')
const jsdom = require('jsdom')
const _ = require('lodash')
const iconv = require('iconv')
const config = require('./config.json')

const requestConfig = {
  uri: config.scheduleLink,
  method: 'GET',
  encoding: 'binary'
}

const AMOUNT_OF_CLASSES = config.amountOfClasses
const workweek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

request(requestConfig)
  .then(windows1251ToUtf8)
  .then(createWindow)
  .then(fetchSchedule)
  .then(schedule => {
    console.log(JSON.stringify(schedule, null, 2))
  })
  .catch(err => console.error(err))

function windows1251ToUtf8 (text) {
  return new iconv.Iconv('windows-1251', 'utf8')
    .convert(new Buffer(text, 'binary'))
    .toString()
}

function createWindow (html) {
  return new Promise((resolve, reject) => {
    jsdom.env(html, (err, win) => {
      if (err) {
        reject(err)
        return
      }
      resolve(win)
    })
  })
}

function fetchSchedule(window) {
  const tbody = window.document.querySelector('tbody')

  if (!tbody) return Promise.reject('No schedule table found!')
  const groupBSchedule = getScheduleForGroup(tbody, currentClassEl => currentClassEl.lastChild)
  const groupASchedule = getScheduleForGroup(tbody, currentClassEl => currentClassEl.lastChild.previousSibling)

  return {
    A: groupASchedule,
    B: groupBSchedule
  }
}

function getScheduleForGroup(root, selectGroupNode) {
  let currentClassEl = root.firstChild

  const groupSchedule = _.reduce(workweek, (result, val) => {
    const daySchedule = {
      [val]: _.reduce(
        _.range(AMOUNT_OF_CLASSES),
        (result) => {
          result.push(getCurrentClassInfo(currentClassEl, selectGroupNode))
          currentClassEl = currentClassEl.nextSibling
          return result
        },
        []
      )
    }
    // skip lame separator
    if (currentClassEl) currentClassEl = currentClassEl.nextSibling
    return Object.assign(result, daySchedule)
  }, {})

  return groupSchedule
}

function getCurrentClassInfo(currentClassEl, getNodeForGroup) {
  const node = getNodeForGroup(currentClassEl)
  const teacherNode = node.querySelector('.prp')
  const lessonNode = node.querySelector('.predm')
  const classroomNode = node.querySelector('.text-info')
  if (!classroomNode || !lessonNode || !teacherNode) {
    return null
  }
  const result = {
    teacher: teacherNode && teacherNode.textContent || '',
    lesson: lessonNode && lessonNode.textContent || '',
    classroom: classroomNode && classroomNode.textContent || ''
  }
  return result
}