pipeline {
    agent any

    environment {
        DOCKERHUB_USER = "laksh2611"
        SERVER_IMAGE   = "expense-server"
        CLIENT_IMAGE   = "expense-client"
        TAG            = "latest"

        PROD_USER = "ubuntu"
        PROD_HOST = "YOUR_SERVER_IP"
        PROD_DIR  = "/var/www/expense-management"
    }

    stages {

        stage('Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/YOUR_REPO.git'
            }
        }

        stage('Build Server Image') {
            steps {
                script {
                    docker.build("${DOCKERHUB_USER}/${SERVER_IMAGE}:${TAG}", "./server")
                }
            }
        }

        stage('Build Client Image') {
            steps {
                script {
                    docker.build("${DOCKERHUB_USER}/${CLIENT_IMAGE}:${TAG}", "./client")
                }
            }
        }

        stage('Docker Hub Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                    """
                }
            }
        }

        stage('Push Images') {
            steps {
                sh """
                docker push ${DOCKERHUB_USER}/${SERVER_IMAGE}:${TAG}
                docker push ${DOCKERHUB_USER}/${CLIENT_IMAGE}:${TAG}
                """
            }
        }

        stage('Deploy to Production') {
            steps {
                sshagent(['prod-server-key']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_HOST} << 'EOF'
                      cd ${PROD_DIR}

                      docker pull ${DOCKERHUB_USER}/${SERVER_IMAGE}:${TAG}
                      docker pull ${DOCKERHUB_USER}/${CLIENT_IMAGE}:${TAG}

                      docker-compose down
                      docker-compose up -d

                      docker image prune -f
                    EOF
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful!"
        }
        failure {
            echo "❌ Deployment failed!"
        }
    }
}
