require('dotenv').config()
const { ApolloServer, gql } = require('apollo-server')
const uuid = require('uuid/v1')
const mongoose = require('mongoose')

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

let authors = []

/*
 * It would be more sensible to assosiate book and the author by saving
 * the author id instead of the name to the book.
 * For simplicity we however save the author name.
 */

let books = []

const typeDefs = gql`
  type Book {
    title: String!
    published: Int!
    author: String!
    id: ID!
    genres: [String!]
  }

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int!
  }

  type Query {
    hello: String!
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]
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
    hello: () => 'world',
    bookCount: () => books.length,
    authorCount: () => authors.length,
    allBooks: (root, args) => {
      //no parameters
      if (!args.author && !args.genre) return books
      //both parameters given
      if (args.author && args.genre)
        return books
          .filter(b => b.author === args.author)
          .filter(b => b.genres.includes(args.genre))
      //just author given
      if (args.author) return books.filter(b => b.author === args.author)
      //just genre given
      if (args.genre) return books.filter(b => b.genres.includes(args.genre))
    },
    allAuthors: (root, argv) => authors
  },
  Author: {
    name: root => root.name,
    bookCount: root => books.filter(b => b.author === root.name).length
  },
  Mutation: {
    addBook: (root, args) => {
      const newBook = { ...args, id: uuid() }
      books = books.concat(newBook)
      //new author
      if (!authors.find(b => b.author === args.author)) {
        const newAuthor = {
          name: args.author,
          id: uuid()
        }
        authors = authors.concat(newAuthor)
        console.log('new author added', authors)
      }
      return newBook
    },
    editAuthor: (root, args) => {
      let updateAuthor = authors.find(a => a.name === args.name)
      console.log(updateAuthor)
      if (!updateAuthor) return null
      updateAuthor = { ...updateAuthor, born: args.setBornTo }
      authors = authors.map(a => (a.name === args.name ? updateAuthor : a))
      return updateAuthor
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
