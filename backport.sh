git reset HEAD~1
rm ./backport.sh
git cherry-pick 6ec2fb2b56dd4ac53344eaa43a257f4809a5c1dd
echo 'Resolve conflicts and force push this branch.\n\nTo backport translations run: bin/i18n/merge-translations <release-branch>'
