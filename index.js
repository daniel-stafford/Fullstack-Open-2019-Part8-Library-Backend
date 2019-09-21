require('dotenv').config()
const { ApolloServer, gql } = require('apollo-server')
const uuid = require('uuid/v1')
const mongoose = require('mongoose')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')
const jwt = require('jsonwebtoken')

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
  type User {
    username: String!
    books: [Book!]!
    id: ID!
  }

  type Token {
    value: String!
  }

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
    me: User
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
    createUser(username: String!): User
    login(username: String!, password: String!): Token
  }
`

const resolvers = {
  Query: {
    me: (root, args, context) => {
      return context.currentUser
    },
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
      const currentUser = context.currentUser
      if (!currentUser) {
        throw new AuthenticationError('user not authenticated')
      }
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
      const savedBook = Book.findById(newBook.id).populate('author')
      currentUser.books = currentUser.books.concat(savedBook)
      return savedBook
    },
    editAuthor: async (root, args) => {
      const { name, setBornTo } = args
      const currentUser = context.currentUser
      if (!currentUser) {
        throw new AuthenticationError('not authenticated')
      }
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
    },
    createUser: (root, args) => {
      const user = new User({ username: args.username })
      return user.save().catch(error => {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== 'password') {
        throw new UserInputError('wrong credentials')
      }

      const userForToken = {
        username: user.username,
        id: user._id
      }

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET)
      const currentUser = await User.findById(decodedToken.id)
      return { currentUser }
    }
  }
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
