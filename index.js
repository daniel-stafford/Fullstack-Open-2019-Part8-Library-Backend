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
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch(error => {
    console.log('error connection to MongoDB:', error.message)
  })

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
    allBooks: (root, args) => {
      //genre parameter not used in front end yet...
      if (!args.genre) {
        return Book.find({}).populate('author')
      }
      return Book.find({ genres: { $in: args.genre } }).populate('author')
    },
    allAuthors: () => Author.find({})
  },
  Author: {
    bookCount: async root => {
      const books = await Book.find({ author: root.id })
      return books.length
    }
  },
  Mutation: {
    addBook: async (root, args) => {
      const { title, published, author, genres } = args
      if (!title || !author || !published || !genres)
        throw new UserInputError(error.message, { invalidArgs: args })
      let authorId
      const authorDuplicate = await Author.findOne({ name: author })
      if (authorDuplicate) {
        authorId = authorDuplicate.id
      } else {
        const newAuthor = new Author({ name: author })
        await newAuthor.save()
        authorId = newAuthor.id
      }
      const newBook = new Book({
        title,
        published,
        //assigning the value id to author key preps for population below
        author: authorId,
        genres
      })
      try {
        await newBook.save()
      } catch (error) {
        throw new UserInputError(error.message, { invalidArgs: args })
      }
      //remember to populate
      return Book.findById(newBook.id).populate('author')
    },
    editAuthor: async (root, args) => {
      const { name, setBornTo } = args
      if ((setBornTo = '')) {
        console.log('error running')
        throw new UserInputError(error.message, { invalidArgs: args })
      }
      const filter = { name }
      const update = { born: setBornTo }
      const updatedAuthor = await Author.findOneAndUpdate(filter, update, {
        new: true
      })
      return updatedAuthor
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
