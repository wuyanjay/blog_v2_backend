const assert = require('node:assert/strict')

const userMod = require('../dist/models/User')
const postMod = require('../dist/models/Post')
const viewMod = require('../dist/models/ViewLog')
const followMod = require('../dist/models/Follow')

const userId = '507f1f77bcf86cd799439011'
const postId = '507f1f77bcf86cd799439012'

function chain(value) {
  const query = {
    select: () => query,
    lean: () => query,
    sort: () => query,
    limit: () => query,
    populate: () => query,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  }
  return query
}

function setup() {
  let findCalls = 0
  const postFilters = []
  const viewMatches = []

  userMod.User = {
    findById: () => chain({ _id: userId }),
  }

  postMod.Post = {
    find: (filter) => {
      postFilters.push(filter)
      findCalls += 1

      if (findCalls === 1) return chain([{ _id: postId }])
      if (findCalls === 2) return chain([{ _id: 'created' }])
      return chain([{ _id: postId, title: 'viewed' }])
    },
    countDocuments: (filter) => {
      if (!filter.createdAt) return Promise.resolve(12)
      if (filter.createdAt.$lt) return Promise.resolve(2)
      return Promise.resolve(4)
    },
    aggregate: () => Promise.resolve([{ total: 80 }]),
  }

  viewMod.ViewLog = {
    countDocuments: (filter) => {
      if (filter.createdAt.$lt) return Promise.resolve(2)
      return Promise.resolve(6)
    },
    aggregate: (pipeline) => {
      viewMatches.push(pipeline[0].$match)
      return Promise.resolve([{ _id: postId }])
    },
  }

  followMod.Follow = {
    countDocuments: (filter) => {
      if (!filter.createdAt) return Promise.resolve(9)
      if (filter.createdAt.$lt) return Promise.resolve(1)
      return Promise.resolve(3)
    },
  }

  return { postFilters, viewMatches }
}

async function run() {
  const state = setup()
  const { statsService } = require('../dist/services/stats.service')

  const week = await statsService.getStats(userId, 7, userId)
  assert.deepEqual(week.totals, { posts: 12, views: 80, followers: 9 })
  assert.deepEqual(week.periodStats, { posts: 4, views: 6, followers: 3 })
  assert.deepEqual(week.changes, { posts: 100, views: 200, followers: 200 })
  assert.ok(state.postFilters[1].createdAt)
  assert.ok(state.viewMatches[0].createdAt)

  const allState = setup()
  const all = await statsService.getStats(userId, undefined, userId)
  assert.deepEqual(all.periodStats, all.totals)
  assert.deepEqual(all.changes, { posts: null, views: null, followers: null })
  assert.equal(allState.postFilters[1].createdAt, undefined)
  assert.equal(allState.viewMatches[0].createdAt, undefined)

  console.log('stats service tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
