# Next Subtask Implementation Prompt

Please check the tasks.md file to find the last subtask implemented.
Please continue with the next subtask. Please, work subtask by subtask and not task by task. Wait until I ask you to implement another subtask. Let's go for the next subtask.
Write the test code for the next subtask not implemented yet and, once done that, write the code of that subtask making sure it passes the test you wrote before.
Run the tests, analyse the errors and fix them.
Write the following log files, making sure the files are named starting with T (capital T) and the subtask number in a three figures number (e.g. T002.1 for subtask 2.1):
- **Implementation subtask log file** and save it in the `/log_files` folder under the name `TXXX.X_"name of the subtask"_Log`
- **Test_log file** and write it in the `/log_tests` folder under the name `TXXX.X_"name of the subtask"_TestLog`
- **Log_learn file** or didactic log file explaining what has been developed in the project, why and how. Save it in the `/log_learn` folder under the name of `TXXX.X_"name of the subtask"_Guide`
## Important Reminders
- This setup is containerized in Docker and there is no need to install the database or the Redis file.
- Don't forget to update the tasks.md file crossing the subtask you just completed once you're done with the tests, completed the log file and the learn file. Please add as well the implementation details.
- Don't forget to use Tailwind for all the CSS related code.
