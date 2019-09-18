require('dotenv').config()
const { ApolloServer, gql } = require('apollo-server')
const uuid = require('uuid/v1')
const mongoose = require('mongoose')
const Book = require('./models/book')
const Author = require('./models/author')

mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)

const url = process.env.MONGODB_URI

console.log('connecting to', url)

mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ensureIndex: true
  })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch(error => {
    console.log('error connection to MongoDB:', error.message)
  })

// changing Book's graphql schema from author: String! to author: author! causes graphql to get a status 400 error and to ask for subfields
const typeDefs = gql`
  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int!
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]
  }

  type Query {
    hello: String!
    bookCount: Int!
    authorCount: Int!
    allBooks: [Book!]
    allAuthors: [Author!]!
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(name: String!, setBornTo: Int): Author
  }
`

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: () => Book.find({}).populate('author'),
    allAuthors: () => Author.find({})
  },
  Author: {
    bookCount: async root => {
      const books = await Book.find({ author: root.id })
      return books.length
    }
  },
  Mutation: {
    //to do
    addBook: (root, args) => {
      // const newBook = { ...args, id: uuid() }
      // books = books.concat(newBook)
      // //new author
      // if (!authors.find(b => b.author === args.author)) {
      //   const newAuthor = {
      //     name: args.author,
      //     id: uuid()
      //   }
      //   authors = authors.concat(newAuthor)
      //   console.log('new author added', authors)
      // }
      // return newBook
    },

    //to do
    editAuthor: (root, args) => {
      // let updateAuthor = authors.find(a => a.name === args.name)
      // console.log(updateAuthor)
      // if (!updateAuthor) return null
      // updateAuthor = { ...updateAuthor, born: args.setBornTo }
      // authors = authors.map(a => (a.name === args.name ? updateAuthor : a))
      // return updateAuthor
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
