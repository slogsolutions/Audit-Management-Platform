pipeline {
    agent any

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Images') {
            steps {
                sh """
                  docker build -t laksh2611/expense-server:latest ./server
                  docker build -t laksh2611/expense-client:latest ./client
                """
            }
        }

        stage('Docker Hub Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
                }
            }
        }

        stage('Push Images') {
            steps {
                sh """
                  docker push laksh2611/expense-server:latest
                  docker push laksh2611/expense-client:latest
                """
            }
        }

        stage('Deploy to VPS') {
            steps {
                sshagent(['prod-server-key']) {
                    withCredentials([
                        string(credentialsId: 'PROD_HOST', variable: 'PROD_HOST'),
                        string(credentialsId: 'PROD_USER', variable: 'PROD_USER'),
                        string(credentialsId: 'PROD_DIR',  variable: 'PROD_DIR')
                    ]) {
                        sh """
                        ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_HOST} '
                          cd ${PROD_DIR}

                          docker pull laksh2611/expense-server:latest
                          docker pull laksh2611/expense-client:latest

                          docker compose down
                          docker compose up -d

                          docker image prune -f
                        '
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful"
        }
        failure {
            echo "❌ Deployment failed"
        }
    }
}
