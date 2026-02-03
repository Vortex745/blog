# 数据库设计文档 (Database Design)

## 1. Users (用户表)
存储用户基本信息。

| 字段名     | 类型     | 必填 | 说明               |
| ---------- | -------- | ---- | ------------------ |
| id         | Int      | Yes  | 主键，自增         |
| username   | String   | Yes  | 用户名，唯一       |
| email      | String   | Yes  | 邮箱，唯一         |
| password   | String   | Yes  | 密码 (加密存储)    |
| avatar     | String   | No   | 头像 URL           |
| created_at | DateTime | Yes  | 创建时间           |

## 2. Posts (文章表)
存储博客文章内容。

| 字段名     | 类型     | 必填 | 说明                         |
| ---------- | -------- | ---- | ---------------------------- |
| id         | Int      | Yes  | 主键，自增                   |
| user_id    | Int      | Yes  | 外键 -> users.id             |
| title      | String   | Yes  | 文章标题                     |
| content    | String   | Yes  | 文章内容 (Markdown)          |
| summary    | String   | No   | 文章摘要                     |
| cover      | String   | No   | 封面图片 URL                 |
| status     | String   | Yes  | 状态 (published/draft)       |
| views      | Int      | Yes  | 阅读量，默认 0               |
| created_at | DateTime | Yes  | 创建时间                     |
| updated_at | DateTime | Yes  | 更新时间                     |

## 3. Categories (分类表)
文章分类。

| 字段名     | 类型     | 必填 | 说明               |
| ---------- | -------- | ---- | ------------------ |
| id         | Int      | Yes  | 主键，自增         |
| name       | String   | Yes  | 分类名称，唯一     |
| created_at | DateTime | Yes  | 创建时间           |

## 4. Post_Categories (文章-分类关联表)
多对多关联表。

| 字段名      | 类型 | 必填 | 说明                 |
| ----------- | ---- | ---- | -------------------- |
| post_id     | Int  | Yes  | 外键 -> posts.id     |
| category_id | Int  | Yes  | 外键 -> categories.id|

## 5. Tags (标签表)
文章标签。

| 字段名 | 类型   | 必填 | 说明           |
| ------ | ------ | ---- | -------------- |
| id     | Int    | Yes  | 主键，自增     |
| name   | String | Yes  | 标签名称，唯一 |

## 6. Post_Tags (文章-标签关联表)
多对多关联表。

| 字段名  | 类型 | 必填 | 说明             |
| ------- | ---- | ---- | ---------------- |
| post_id | Int  | Yes  | 外键 -> posts.id |
| tag_id  | Int  | Yes  | 外键 -> tags.id  |

## 7. Comments (评论表)
文章评论。

| 字段名     | 类型     | 必填 | 说明               |
| ---------- | -------- | ---- | ------------------ |
| id         | Int      | Yes  | 主键，自增         |
| post_id    | Int      | Yes  | 外键 -> posts.id   |
| user_id    | Int      | Yes  | 外键 -> users.id   |
| content    | String   | Yes  | 评论内容           |
| created_at | DateTime | Yes  | 创建时间           |

## 8. About (关于我表)
**新增**：存储个人介绍页面的内容。

| 字段名     | 类型     | 必填 | 说明               |
| ---------- | -------- | ---- | ------------------ |
| id         | Int      | Yes  | 主键，自增         |
| user_id    | Int      | Yes  | 外键 -> users.id   |
| content    | String   | Yes  | 介绍内容 (Markdown)|
| updated_at | DateTime | Yes  | 更新时间           |
