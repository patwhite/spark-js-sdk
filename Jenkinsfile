// TODO check build log for disconnect/reconnect

def cleanup = { isValidatedMergeBuild ->
  archive 'reports/**/*'
  sh 'rm -f .env'

  if (isValidatedMergeBuild && currentBuild.result != 'SUCCESS') {
    withCredentials([usernamePassword(
      credentialsId: '386d3445-b855-40e4-999a-dc5801336a69',
      passwordVariable: 'GAUNTLET_PASSWORD',
      usernameVariable: 'GAUNTLET_USERNAME'
    )]) {
      sh "curl -i --user ${GAUNTLET_USERNAME}:${GAUNTLET_PASSWORD} -X PUT 'https://gauntlet.wbx2.com/api/queues/spark-js-sdk/master?componentTestStatus=failure&commitId=${GIT_COMMIT}'"
    }
  }
}

def generateDockerEnv = { ->
  def dockerEnv = ""
  if (env.ATLAS_SERVICE_URL != null) {
    dockerEnv+="ATLAS_SERVICE_URL=${env.ATLAS_SERVICE_URL}\n"
  }
  if (env.BUILD_NUMBER != null) {
    dockerEnv+="BUILD_NUMBER=${env.BUILD_NUMBER}\n"
  }
  if (env.CISCOSPARK_APPID_ORGID != null) {
    dockerEnv+="CISCOSPARK_APPID_ORGID=${env.CISCOSPARK_APPID_ORGID}\n"
  }
  if (env.CONVERSATION_SERVICE != null) {
    dockerEnv+="CONVERSATION_SERVICE=${env.CONVERSATION_SERVICE}\n"
  }
  if (env.COMMON_IDENTITY_OAUTH_SERVICE_URL != null) {
    dockerEnv+="COMMON_IDENTITY_OAUTH_SERVICE_URL=${env.COMMON_IDENTITY_OAUTH_SERVICE_URL}\n"
  }
  if (env.COVERAGE != null) {
    dockerEnv+="COVERAGE=${env.COVERAGE}\n"
  }
  if (env.DEVICE_REGISTRATION_URL != null) {
    dockerEnv+="DEVICE_REGISTRATION_URL=${env.DEVICE_REGISTRATION_URL}\n"
  }
  if (env.ENABLE_NETWORK_LOGGING != null) {
    dockerEnv+="ENABLE_NETWORK_LOGGING=${env.ENABLE_NETWORK_LOGGING}\n"
  }
  if (env.ENABLE_VERBOSE_NETWORK_LOGGING != null) {
    dockerEnv+="ENABLE_VERBOSE_NETWORK_LOGGING=${env.ENABLE_VERBOSE_NETWORK_LOGGING}\n"
  }
  if (env.HYDRA_SERVICE_URL != null) {
    dockerEnv+="HYDRA_SERVICE_URL=${env.HYDRA_SERVICE_URL}\n"
  }
  if (env.PIPELINE != null) {
    dockerEnv+="PIPELINE=${env.PIPELINE}\n"
  }
  if (env.SAUCE_IS_DOWN != null) {
    dockerEnv+="SAUCE_IS_DOWN=${env.SAUCE_IS_DOWN}\n"
  }
  if (env.SDK_BUILD_DEBUG != null) {
    dockerEnv+="SDK_BUILD_DEBUG=${env.SDK_BUILD_DEBUG}\n"
  }
  if (env.SKIP_FLAKY_TESTS != null) {
    dockerEnv+="SKIP_FLAKY_TESTS=${env.SKIP_FLAKY_TESTS}\n"
  }
  if (env.WDM_SERVICE_URL != null) {
    dockerEnv+="WDM_SERVICE_URL=${env.WDM_SERVICE_URL}\n"
  }
  if (env.WORKSPACE != null) {
    dockerEnv+="WORKSPACE=${env.WORKSPACE}\n"
  }
  writeFile file: DOCKER_ENV_FILE, text: dockerEnv
}

def generateSecretsFile = { ->
  withCredentials([
    string(credentialsId: '9f44ab21-7e83-480d-8fb3-e6495bf7e9f3', variable: 'CISCOSPARK_CLIENT_SECRET'),
    string(credentialsId: 'CISCOSPARK_APPID_SECRET', variable: 'CISCOSPARK_APPID_SECRET'),
    usernamePassword(credentialsId: 'SAUCE_LABS_VALIDATED_MERGE_CREDENTIALS', passwordVariable: 'SAUCE_ACCESS_KEY', usernameVariable: 'SAUCE_USERNAME'),
    string(credentialsId: 'ddfd04fb-e00a-4df0-9250-9a7cb37bce0e', variable: 'COMMON_IDENTITY_CLIENT_SECRET')
  ]) {
    def secrets = ""
    secrets += "COMMON_IDENTITY_CLIENT_SECRET=${COMMON_IDENTITY_CLIENT_SECRET}\n"
    secrets += "CISCOSPARK_APPID_SECRET=${CISCOSPARK_APPID_SECRET}\n"
    secrets += "CISCOSPARK_CLIENT_SECRET=${CISCOSPARK_CLIENT_SECRET}\n"
    secrets += "SAUCE_USERNAME=${SAUCE_USERNAME}\n"
    secrets += "SAUCE_ACCESS_KEY=${SAUCE_ACCESS_KEY}\n"
    writeFile file: ENV_FILE, text: secrets
  }
}

ansiColor('xterm') {
  timestamps {
    timeout(90) {

      node("SPARK_JS_SDK_VALIDATING") {
        def GIT_COMMIT
        try {
          env.CONCURRENCY = 4
          env.NPM_CONFIG_REGISTRY = "http://engci-maven-master.cisco.com/artifactory/api/npm/webex-npm-group"
          env.ENABLE_VERBOSE_NETWORK_LOGGING = true
          env.SDK_ROOT_DIR=pwd

          if (JOB_NAME.toLowerCase().contains('validated-merge')) {
            IS_VALIDATED_MERGE_BUILD = true
          }

          if (IS_VALIDATED_MERGE_BUILD) {
            env.COVERAGE = true
          }
          else {
            env.PIPELINE = true
            env.SKIP_FLAKY_TESTS = true
          }

          DOCKER_IMAGE_NAME = "${JOB_NAME}-${BUILD_NUMBER}-builder"
          def image

          DOCKER_ENV_FILE = "${env.WORKSPACE}/docker-env"
          ENV_FILE = "${env.WORKSPACE}/.env"

          DOCKER_RUN_OPTS = ''
          DOCKER_RUN_OPTS = "${DOCKER_RUN_OPTS} --env-file=${DOCKER_ENV_FILE}"
          DOCKER_RUN_OPTS = "${DOCKER_RUN_OPTS} --env-file=${ENV_FILE}"
          DOCKER_RUN_OPTS = "${DOCKER_RUN_OPTS} -e NPM_CONFIG_CACHE=${env.WORKSPACE}/.npm"
          DOCKER_RUN_OPTS = "${DOCKER_RUN_OPTS} --volumes-from=\$(hostname)"
          DOCKER_RUN_OPTS = "${DOCKER_RUN_OPTS} --user=\$(id -u):\$(id -g)"
          // DOCKER_RUN_OPTS has some values in it that we want to evaluate on
          // the node, but image.inside doesn't do subshell execution. We'll use
          // echo to evaluate once on the node and store the values.
          DOCKER_RUN_OPTS = sh script: "echo -n ${DOCKER_RUN_OPTS}", returnStdout: true
          // image.inside uses the -d flag, so we can only use --rm for
          // bash-started containers
          env.DOCKER_RUN_OPTS = "${DOCKER_RUN_OPTS} --rm ${DOCKER_IMAGE_NAME}"

          stage('checkout') {
            checkout scm
            if (IS_VALIDATED_MERGE_BUILD) {
              // Store the current commit to use with Gauntlet
              GIT_COMMIT = sh script: 'git rev-parse HEAD | tr -d "\n"', returnStdout: true

              sshagent(['30363169-a608-4f9b-8ecc-58b7fb87181b']) {
                // return the exit code because we don't care about failures
                sh script: 'git remote add upstream git@github.com:ciscospark/spark-js-sdk.git', returnStatus: true
                // Make sure local tags don't include failed releases
                sh 'git tag | xargs git tag -d'
                sh 'git gc'

                sh 'git fetch upstream --tags'
              }

              // We need ff-only because the build process makes commits that we
              // don't want to clobber
              sh 'git checkout upstream/master'
              try {
                sh "git merge --ff-only ${GIT_COMMIT}"
              }
              catch (err) {
                currentBuild.description = 'not possible to fast forward'
                throw err;
              }

              // Copy the global git user details into the local repo so that the
              // docker containers have access to it.
              sh 'git config user.email spark-js-sdk.gen@cisco.com'
              sh 'git config user.name Jenkins'
            }

            generateDockerEnv()
            generateSecretsFile()
          }

          stage('docker build') {
            sh 'echo "RUN groupadd -g $(id -g) jenkins" >> ./docker/builder/Dockerfile'
            sh 'echo "RUN useradd -u $(id -u) -g $(id -g) -m jenkins" >> ./docker/builder/Dockerfile'
            sh "echo 'WORKDIR ${env.WORKSPACE}' >> ./docker/builder/Dockerfile"
            sh 'echo "USER $(id -u)" >> ./docker/builder/Dockerfile'

            retry(3) {
              dir('docker/builder') {
                image = docker.build(DOCKER_IMAGE_NAME)
              }
              // Reset the Dockerfile to make sure we don't accidentally commit it
              // later
              sh "git checkout ./docker/builder/Dockerfile"
            }
          }

          stage('install') {
            image.inside(DOCKER_RUN_OPTS) {
              sh 'npm install'
              sh 'npm run bootstrap'
            }
          }

          stage('clean') {
            image.inside(DOCKER_RUN_OPTS) {
              sh 'npm run grunt -- clean'
              sh 'npm run grunt:concurrent -- clean'
              sh 'npm run clean-empty-packages'
            }
            sh 'rm -rf ".sauce/*/sc.*"'
            sh 'rm -rf ".sauce/*/sauce_connect*log"'
            sh 'rm -rf reports'
            sh 'mkdir -p reports/coverage'
            sh 'mkdir -p reports/coverage-final'
            sh 'mkdir -p reports/junit'
            sh 'mkdir -p reports/logs'
            sh 'mkdir -p reports/sauce'
            sh 'mkdir -p reports/style'
            sh 'chmod -R ugo+w reports'
          }

          if (IS_VALIDATED_MERGE_BUILD) {
            stage('static analysis') {
              // TODO use grunt:package so that per-package rules can kick in
              image.inside(DOCKER_RUN_OPTS) {
                sh script: "npm run grunt:concurrent -- eslint", returnStatus: true
                if (!fileExists("./reports/style/eslint-concurrent.xml")) {
                  error('Static Analysis did not produce eslint-concurrent.xml')
                }
                sh script: "npm run grunt -- eslint", returnStatus: true
                if (!fileExists("./reports/style/eslint-legacy.xml")) {
                  error('Static Analysis did not produce eslint-legacy.xml')
                }
              }
              step([$class: 'CheckStylePublisher',
                canComputeNew: false,
                defaultEncoding: '',
                healthy: '',
                pattern: 'reports/style/**/*.xml',
                thresholdLimit: 'high',
                unHealthy: '',
                unstableTotalHigh: '0'
              ])
            }
          }

          if (!IS_VALIDATED_MERGE_BUILD || currentBuild.result == 'SUCCESS') {
            stage('build') {
              image.inside(DOCKER_RUN_OPTS) {
                sh 'npm run build'
              }
            }

            stage('test') {
              def exitCode = sh script: "./tooling/test.sh", returnStatus: true

              junit 'reports/junit/**/*.xml'

              if (exitCode != 0) {
                error('test.sh exited with non-zero error code, but did not produce junit output to that effect')
              }

              if (currentBuild.result == 'UNSTABLE' && !IS_VALIDATED_MERGE_BUILD) {
                error('Failing build in order to propagate UNSTABLE to parent build')
              }
            }
          }

          if (env.COVERAGE && currentBuild.result == 'SUCCESS') {
            stage('process coverage') {
              image.inside(DOCKER_RUN_OPTS) {
                sh 'npm run grunt:circle -- coverage'
              }
              archive 'reports/cobertura.xml'

              // At the time this script was written, the cobertura plugin didn't
              // support pipelines, so we need to use a freeform job to process
              // code coverage
              coverageBuild = build job: 'spark-js-sdk--validated-merge--coverage-processor', propagate: false
              if (coverageBuild.result != 'SUCCESS') {
                currentBuild.result = coverageBuild.result
                if (coverageBuild.result == 'UNSTABLE') {
                  currentBuild.description = coverageBuild.description
                }
                else if (coverageBuild.result == 'FAILURE') {
                  currentBuild.description = "Coverage job failed. See the logged build url for more details."
                }
              }
            }

            if (IS_VALIDATED_MERGE_BUILD && currentBuild.result == 'SUCCESS') {
              stage('build for release') {
                env.NODE_ENV = ''
                def code = '0'
                def version = sh script: 'echo "v$(cat lerna.json | jq .version | tr -d \'\\"\')"', returnStdout: true
                image.inside(DOCKER_RUN_OPTS) {
                  sh 'npm run build'
                  sh 'npm run grunt:concurrent -- build:docs'
                  sh 'PACKAGE=example-phone npm run grunt:package -- webpack:build'
                  sh 'PACKAGE=widget-message-meet npm run grunt:package build'
                  sh 'npm run grunt -- release'
                  code = sh script: "npm run lerna --silent -- publish --skip-npm --skip-git --repo-version=${version} --yes", returnStatus: true
                }

                if (code == 0) {
                  sh 'git add lerna.json packages/*/package.json'
                  sh "git commit -m v${version}"
                  sh "git tag 'v${version}'"
                }

                sh 'git rev-parse HEAD > .promotion-sha'
                archive '.promotion-sha'
              }
            }

            if (IS_VALIDATED_MERGE_BUILD && currentBuild.result == 'SUCCESS') {
              stage('check #no-push') {
                noPushCount = sh script: 'git log upstream/master.. | grep -c "#no-push"', returnStdout: true
                if (noPushCount != '0') {
                  currentBuild.result = 'ABORTED'
                  currentBuild.description = 'Aborted: git history includes #no-push'
                }
              }
            }

            if (IS_VALIDATED_MERGE_BUILD && currentBuild.result == 'SUCCESS') {
              stage('publish to github') {
                def exitStatus = sh script: "git push origin HEAD:master", returnStatus: true
                if (exitStatus != 0) {
                  currentBuild.description += 'warning: failed to HEAD to github.com\n'
                }
              }

              stage('publish to npm') {
                // TODO use lerna publish directly now that npm fixed READMEs
                // reminder: need to write to ~ not . because lerna runs npm
                // commands in subdirectories
                sh 'echo \'//registry.npmjs.org/:_authToken=${NPM_TOKEN}\' > ~/.npmrc'
                try {
                  def registry = env.NPM_CONFIG_REGISTRY
                  env.NPM_CONFIG_REGISTRY = ''
                  sh 'npm run lerna -- exec --bash -c \'npm publish --access public || true\''
                  env.NPM_CONFIG_REGISTRY = registry
                  sh 'rm -f ~/.npmrc'
                  if (version.length == 0) {
                    currentBuild.description += 'warning: could not determine tag name to push to github.com\n'
                  }
                  else {
                    def exitStatus = sh script: "git push origin ${version}:${version}", returnStatus: true
                    if (exitStatus != 0) {
                      currentBuild.description += 'warning: failed to push version tag to github.com\n'
                    }
                  }
                }
                catch (err) {
                  sh 'rm -f ~/.npmrc'
                  throw err
                }
              }

              stage('publish docs') {
                image.inside(DOCKER_RUN_OPTS) {
                  sh 'npm run grunt:concurrent -- publish:docs'
                }
              }

              stage('publish to ghe') {
                // def exitStatus = sh script: 'git remote | grep -qc ghe', returnStatus: true
                // if (exitStatus == 1) {
                //   sh 'git remote add ghe git@sqbu-github.cisco.com:WebExSquared/spark-js-sdk.git'
                // }
                // exitStatus = sh script: 'git push ghe HEAD:master', returnStatus: true
                // if (!exitStatus) {
                //   currentBuild.description += 'warning: failed to push to github enterprise\n'
                // }
              }

              stage('publish to artifactory') {
                // using a downstream job because (a) we're going to stop
                // publishing to artifactory once the legacy sdk goes away and
                // (b) the npm secret is only recorded in that job.
                def artifactoryBuild = build job: 'spark-js-sdk--publish-to-artifactory', propagate: false
                if (artifactoryBuild.result != 'SUCCESS') {
                  currentBuild.description += 'waring: failed to publish to Artifactory'
                }
              }

              stage('publish to cdn') {
                // Disabled for first pass. Will work with Lex to adjust cdn jobs
                // cdnPublishBuild = build job: 'spark-js-sdk--publish-chat-widget-s3', parameters: [[$class: 'StringParameterValue', name: 'buildNumber', value: currentBuild.number]], propagate: false
                // if (cdnPublishBuild.result != 'SUCCESS') {
                //   currentBuild.description += 'warning: failed to publish to CDN'
                // }
              }
            }
          }

          cleanup(IS_VALIDATED_MERGE_BUILD)
        }
        catch(error) {
          echo error.toString();
          cleanup(IS_VALIDATED_MERGE_BUILD)
          throw error
        }
      }
    }
  }
}