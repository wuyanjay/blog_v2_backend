import mongoose from 'mongoose'
import { Category } from '../src/models/Category'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blog_v2'

interface CategorySeed {
  name: string
  slug?: string
  description?: string
  children?: CategorySeed[]
}

const seedData: CategorySeed[] = [
  {
    name: '前端',
    description: '前端开发相关技术',
    children: [
      { name: 'vue', description: 'Vue.js 框架' },
      { name: 'React', description: 'React 框架' },
    ],
  },
  {
    name: '后端',
    description: '后端开发相关技术',
    children: [
      { name: 'python', description: 'Python 语言' },
      { name: 'nodejs', description: 'Node.js 运行时' },
    ],
  },
  {
    name: '算法',
    description: '数据结构与算法',
  },
  {
    name: '深度学习',
    description: '深度学习与神经网络',
    children: [
      { name: '分类', description: '图像分类任务' },
      { name: '分割', description: '图像分割任务' },
      { name: 'nlp', description: '自然语言处理' },
    ],
  },
]

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  // Clear existing categories
  await Category.deleteMany({})
  console.log('Cleared existing categories')

  async function createCategory(data: CategorySeed, parentId: string | null, order: number) {
    const doc = await Category.create({
      name: data.name,
      ...(data.slug ? { slug: data.slug } : {}),
      description: data.description || '',
      parent: parentId,
      order,
      postCount: 0,
    })
    console.log(`  Created: ${data.name} (${doc._id})`)

    if (data.children) {
      for (let i = 0; i < data.children.length; i++) {
        await createCategory(data.children[i], String(doc._id), i)
      }
    }
  }

  for (let i = 0; i < seedData.length; i++) {
    await createCategory(seedData[i], null, i)
  }

  const count = await Category.countDocuments()
  console.log(`\nSeeded ${count} categories successfully`)

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
