FROM circleci/node

USER root

RUN apt-get update && \
      apt-get install -yq gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
      libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
      libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
      libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
      fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils && \
      apt-get clean && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app

WORKDIR /tmp/app

COPY package.json /tmp/app/package.json
COPY shot.js /tmp/app/shot.js

#RUN npm install
RUN yarn

USER circleci

#COPY . /app

ENTRYPOINT ["node", "shot.js"]
