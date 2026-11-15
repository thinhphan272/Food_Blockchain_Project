package com.smartchain.config;

import com.datastax.oss.driver.api.core.CqlSession;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.Document;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.net.InetSocketAddress;
import java.net.Socket;

@Configuration
public class PolyglotDatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(PolyglotDatabaseConfig.class);

    // MySQL Configuration
    @Value("${MYSQL_HOST:localhost}")
    private String mysqlHost;

    @Value("${MYSQL_PORT:3306}")
    private int mysqlPort;

    @Value("${MYSQL_DATABASE:supermarket_db}")
    private String mysqlDb;

    @Value("${MYSQL_USER:superuser}")
    private String mysqlUser;

    @Value("${MYSQL_PASSWORD:superpassword}")
    private String mysqlPassword;

    // MongoDB Configuration
    @Value("${MONGO_HOST:localhost}")
    private String mongoHost;

    @Value("${MONGO_PORT:27017}")
    private int mongoPort;

    @Value("${MONGO_USER:${MONGO_INITDB_ROOT_USERNAME:mongoadmin}}")
    private String mongoUser;

    @Value("${MONGO_PASSWORD:${MONGO_INITDB_ROOT_PASSWORD:mongopassword}}")
    private String mongoPassword;

    @Value("${MONGO_DATABASE:supermarket_mongo}")
    private String mongoDb;

    // Cassandra Configuration
    @Value("${CASSANDRA_HOST:localhost}")
    private String cassandraHost;

    @Value("${CASSANDRA_PORT:9042}")
    private int cassandraPort;

    // Neo4j Configuration
    @Value("${NEO4J_HOST:localhost}")
    private String neo4jHost;

    @Value("${NEO4J_BOLT_PORT:7687}")
    private int neo4jPort;

    @Value("${NEO4J_USER:neo4j}")
    private String neo4jUser;

    @Value("${NEO4J_PASSWORD:neo4jpassword}")
    private String neo4jPassword;

    public static boolean isPortOpen(String host, int port, int timeoutMs) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Bean
    @Primary
    public DataSource dataSource() {
        DriverManagerDataSource ds = new DriverManagerDataSource();
        if (isPortOpen(mysqlHost, mysqlPort, 800)) {
            String url = String.format(
                "jdbc:mysql://%s:%d/%s?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8",
                mysqlHost, mysqlPort, mysqlDb
            );
            ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
            ds.setUrl(url);
            ds.setUsername(mysqlUser);
            ds.setPassword(mysqlPassword);
            log.info(">>> [MySQL 8.0] Connected to LIVE Docker MySQL container at {}:{}", mysqlHost, mysqlPort);
        } else {
            ds.setDriverClassName("org.h2.Driver");
            ds.setUrl("jdbc:h2:mem:supermarket_db;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_UPPER=FALSE");
            ds.setUsername("sa");
            ds.setPassword("");
            log.info(">>> [MySQL 8.0 Engine] Docker MySQL port {}:{} not open yet -> Using embedded MySQL-compatible ACID engine", mysqlHost, mysqlPort);
        }
        return ds;
    }

    @Bean
    public MongoClient mongoClient() {
        if (isPortOpen(mongoHost, mongoPort, 800)) {
            try {
                String uri = String.format("mongodb://%s:%s@%s:%d/%s?authSource=admin&serverSelectionTimeoutMS=1000",
                        mongoUser, mongoPassword, mongoHost, mongoPort, mongoDb);
                MongoClient client = MongoClients.create(uri);
                client.getDatabase("admin").runCommand(new Document("ping", 1));
                log.info(">>> [MongoDB 6.0] Connected to LIVE Docker MongoDB with auth at {}:{}", mongoHost, mongoPort);
                return client;
            } catch (Exception e) {
                log.info(">>> [MongoDB 6.0] Auth connection failed: {}. Trying no-auth connection...", e.getMessage());
                try {
                    String uriNoAuth = String.format("mongodb://%s:%d/%s?serverSelectionTimeoutMS=1000", mongoHost, mongoPort, mongoDb);
                    MongoClient client = MongoClients.create(uriNoAuth);
                    client.getDatabase(mongoDb).runCommand(new Document("ping", 1));
                    log.info(">>> [MongoDB 6.0] Connected to LIVE MongoDB (no auth) at {}:{}", mongoHost, mongoPort);
                    return client;
                } catch (Exception ex) {
                    log.warn(">>> [MongoDB 6.0] No-auth connection failed: {}. Operating in fallback mode.", ex.getMessage());
                }
            }
        } else {
            log.info(">>> [MongoDB 6.0 Engine] Docker MongoDB port {}:{} not open yet -> Using in-memory fallback", mongoHost, mongoPort);
        }
        return null;
    }

    @Bean
    public CqlSession cqlSession() {
        if (isPortOpen(cassandraHost, cassandraPort, 800)) {
            try {
                CqlSession session = CqlSession.builder()
                        .addContactPoint(new InetSocketAddress(cassandraHost, cassandraPort))
                        .withLocalDatacenter("datacenter1")
                        .build();
                log.info(">>> [Cassandra 4.1] Connected to LIVE Docker Cassandra at {}:{}", cassandraHost, cassandraPort);
                return session;
            } catch (Exception e) {
                log.warn(">>> [Cassandra 4.1] Connection attempt failed: {}", e.getMessage());
            }
        } else {
            log.info(">>> [Cassandra 4.1 Engine] Docker Cassandra port {}:{} not open yet -> Using in-memory fallback", cassandraHost, cassandraPort);
        }
        return null;
    }

    @Bean
    public Driver neo4jDriver() {
        if (isPortOpen(neo4jHost, neo4jPort, 800)) {
            try {
                String uri = String.format("bolt://%s:%d", neo4jHost, neo4jPort);
                Driver driver = GraphDatabase.driver(uri, AuthTokens.basic(neo4jUser, neo4jPassword));
                driver.verifyConnectivity();
                log.info(">>> [Neo4j 5.x] Connected to LIVE Docker Neo4j Bolt at {}:{}", neo4jHost, neo4jPort);
                return driver;
            } catch (Exception e) {
                log.warn(">>> [Neo4j 5.x] Connection attempt failed: {}", e.getMessage());
            }
        } else {
            log.info(">>> [Neo4j 5.x Engine] Docker Neo4j port {}:{} not open yet -> Using in-memory fallback", neo4jHost, neo4jPort);
        }
        return null;
    }
}
